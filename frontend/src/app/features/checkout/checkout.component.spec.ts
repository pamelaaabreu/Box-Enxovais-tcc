import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { NEVER } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { CatalogLayoutComponent } from '../catalog/components/catalog-layout/catalog-layout.component';
import { CheckoutComponent } from './checkout.component';

describe('CheckoutComponent', () => {
  for (const mode of ['payment', 'delivery', 'stock-error'] as const) {
    it('keeps purchase validation intact in quick checkout: ' + mode, async () => {
      TestBed.configureTestingModule({
        imports: [CheckoutComponent],
        providers: [
          provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
          { provide: AuthService, useValue: { getToken: () => 'test', userChanged: NEVER } },
          { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ compra: 'agora' }) } } },
        ],
      }).overrideComponent(CheckoutComponent, {
        remove: { imports: [CatalogLayoutComponent] },
        add: { schemas: [CUSTOM_ELEMENTS_SCHEMA] },
      });
      const http = TestBed.inject(HttpTestingController);
      const cart = TestBed.inject(CartService);
      spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
      await cart.buyNow(2, 1, 3);
      const fixture = TestBed.createComponent(CheckoutComponent);
      http.expectOne('http://localhost:8080/cart').flush({ data: { items: [], totalItems: 0, total: 0 } });
      const add = http.expectOne({ method: 'POST', url: 'http://localhost:8080/cart/items' });
      expect(add.request.body).toEqual({ productId: 2, quantity: 1, variantId: 3 });
      if (mode === 'stock-error') add.flush({ message: 'Sem estoque' }, { status: 409, statusText: 'Conflict' });
      else add.flush({ data: { items: [{ id: 42, productId: 2, variantId: 3, quantity: 1, available: true }], totalItems: 1, total: 25000 } });
      const address = { id: 1, isDefault: true, zipCode: '01001-000', recipient: 'Teste', street: 'Praça', number: '1', neighborhood: 'Sé', city: 'São Paulo', state: 'SP' };
      http.expectOne('http://localhost:8080/me/addresses').flush({ data: mode === 'delivery' ? [] : [address] });
      http.expectOne('http://localhost:8080/me').flush({ data: { phone: '11912345678' } });
      fixture.detectChanges();
      expect(fixture.componentInstance.step()).toBe(mode === 'payment' ? 2 : 1);
      if (mode === 'stock-error') expect(cart.error()).toBe('Sem estoque');
      cart.consumeQuickPurchase(() => fail('Intenção repetida'));
      http.verify();
    });
  }

  it('submits delivery edits and confirms with the address shown in review', async () => {
    TestBed.configureTestingModule({
      imports: [CheckoutComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { userChanged: NEVER } },
        { provide: CartService, useValue: {
          load: jasmine.createSpy('load'),
          busy: () => false,
          loading: () => false,
          error: () => '',
          cart: () => ({ items: [{ id: 1, available: true, quantity: 1, stock: 2, name: 'Teste', image: '' }] }),
          total: () => 25,
          totalItems: () => 1,
        } },
      ],
    }).overrideComponent(CheckoutComponent, {
      remove: { imports: [CatalogLayoutComponent] },
      add: { schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });
    const fixture = TestBed.createComponent(CheckoutComponent);
    const component = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    const saved = {
      id: 41, label: 'Casa', isDefault: true, recipient: 'Pessoa Teste',
      street: 'Rua Salva', number: '8', zipCode: '01001-000', complement: '',
      neighborhood: 'Centro', city: 'São Paulo', state: 'SP',
    };
    http.expectOne('http://localhost:8080/me/addresses').flush({ data: [saved] });
    http.expectOne('http://localhost:8080/me').flush({
      data: { name: 'Pessoa Teste', email: 'test@example.com', phone: '11912345678' },
    });
    expect(component.selectedAddress()?.id).toBe(41);
    expect(component.contactPhone.value).toBe('11912345678');
    component.selectedAddressId.set(0);
    component.saveAddress.setValue(true);
    component.contactPhone.setValue('11987654321');
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    component.address.setValue({
      recipient: 'Nome Inicial', zipCode: '01001-000', street: 'Rua Teste',
      number: '10', complement: '', neighborhood: 'Centro', city: 'São Paulo', state: 'SP',
    }, { emitEvent: false });
    component.postalFilled.set(['street', 'neighborhood', 'city', 'state']);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    const advance = () => {
      host.querySelector<HTMLButtonElement>('.summary-footer .primary')!.click();
      fixture.detectChanges();
    };
    advance();
    expect(component.step()).toBe(2);
    advance();
    expect(component.step()).toBe(3);
    host.querySelector<HTMLButtonElement>('[aria-label="Editar endereço de entrega"]')!.click();
    fixture.detectChanges();
    expect(component.step()).toBe(1);
    expect(host.querySelector<HTMLInputElement>('#street')!.readOnly).toBeTrue();
    for (const [field, value] of Object.entries({ number: '42', complement: 'Apto 3', recipient: 'Nome Atualizado' })) {
      const input = host.querySelector<HTMLInputElement>('#' + field)!;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    advance();
    advance();
    expect(host.querySelector('.review-details')!.textContent).toContain('Nome Atualizado');
    expect(host.querySelector('.review-details')!.textContent).toContain('Rua Teste, 42');
    expect(host.querySelector('.review-details')!.textContent).toContain('Apto 3');
    advance();
    component.confirm();
    const request = http.expectOne({ method: 'POST', url: 'http://localhost:8080/checkout' });
    expect(request.request.body.address).toEqual(component.address.getRawValue());
    expect(request.request.body.saveAddress).toBeTrue();
    expect(request.request.body.contactPhone).toBe('11987654321');
    expect(request.request.body.addressId).toBeUndefined();
    expect(request.request.body.address.number).toBe('42');
    expect(request.request.body.address.complement).toBe('Apto 3');
    expect(request.request.body.address.recipient).toBe('Nome Atualizado');
    request.flush({ success: true, data: { id: 7, total: 25, status: 'simulated_approved' } });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledOnceWith(['/checkout/success', 7]);
    http.verify();
  });
});
