import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
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
  for (const mode of ['payment', 'delivery', 'stock-error', 'reuse', 'removed', 'unavailable'] as const) {
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
      const reuse = mode === 'reuse' || mode === 'removed' || mode === 'unavailable';
      await cart.buyNow(2, 1, 3, reuse);
      const fixture = TestBed.createComponent(CheckoutComponent);
      const cartItems = reuse && mode !== 'removed'
        ? [{ id: 42, productId: 2, variantId: 3, quantity: 8, available: mode !== 'unavailable' }]
        : [];
      http.expectOne('http://localhost:8080/cart').flush({ data: { items: cartItems, totalItems: cartItems.length ? 8 : 0, total: 0 } });
      if (reuse) {
        http.expectNone({ method: 'POST', url: 'http://localhost:8080/cart/items' });
      } else {
      const add = http.expectOne({ method: 'POST', url: 'http://localhost:8080/cart/items' });
      expect(add.request.body).toEqual({ productId: 2, quantity: 1, variantId: 3 });
      if (mode === 'stock-error') add.flush({ message: 'Sem estoque' }, { status: 409, statusText: 'Conflict' });
      else add.flush({ data: { items: [{ id: 42, productId: 2, variantId: 3, quantity: 1, available: true }], totalItems: 1, total: 25000 } });
      }
      const address = { id: 1, isDefault: true, zipCode: '01001-000', recipient: 'Teste', street: 'Praça', number: '1', neighborhood: 'Sé', city: 'São Paulo', state: 'SP' };
      http.expectOne('http://localhost:8080/me/addresses').flush({ data: mode === 'delivery' ? [] : [address] });
      http.expectOne('http://localhost:8080/me').flush({ data: { phone: '11912345678' } });
      http.match(request => request.url.endsWith('/shipping/quote')).forEach(request => request.flush({ priceCents: 1000, minDays: 2, maxDays: 4 }));
      fixture.detectChanges();
      expect(fixture.componentInstance.step()).toBe(mode === 'payment' || mode === 'reuse' ? 2 : 1);
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
    http.expectOne(request => request.url.endsWith('/shipping/quote')).flush({ priceCents: 1000, minDays: 2, maxDays: 4 });
    component.selectAddress(0);
    component.saveAddress.setValue(true);
    component.contactPhone.setValue('11987654321');
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    component.address.setValue({
      recipient: 'Nome Inicial', zipCode: '01001-000', street: 'Rua Teste',
      number: '10', complement: '', neighborhood: 'Centro', city: 'São Paulo', state: 'SP',
    }, { emitEvent: false });
    component.checkCoverage();
    http.expectOne(request => request.url.endsWith('/shipping/quote')).flush({ priceCents: 1000, minDays: 2, maxDays: 4 });
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
    request.flush({ success: true, data: { id: 7, total: 35, status: 'simulated_approved' } });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledOnceWith(['/checkout/success', 7]);
    http.verify();
  });
});

describe('Checkout delivery selection', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<CheckoutComponent>>;
  let http: HttpTestingController;
  const address = { recipient: 'Pessoa Teste', zipCode: '01001-000', street: 'Rua Teste', number: '12', complement: '', neighborhood: 'Centro', city: 'São Paulo', state: 'SP' };
  const saved = { ...address, id: 41, label: 'Casa', isDefault: false };
  const quote = { priceCents: 1000, minDays: 2, maxDays: 4 };
  beforeEach(() => {
    sessionStorage.removeItem('box.checkout.address.55');
    TestBed.configureTestingModule({ imports: [CheckoutComponent], providers: [
      provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
      { provide: AuthService, useValue: { getToken: () => 'e30.' + btoa(JSON.stringify({ userId: 55 })) + '.x', userChanged: NEVER } },
      { provide: CartService, useValue: { load: jasmine.createSpy('load'), busy: () => false, loading: () => false, error: () => '', cart: () => ({ items: [{ id: 1, available: true, quantity: 1, stock: 2, name: 'Teste', image: '' }] }), total: () => 25, totalItems: () => 1 } },
    ] }).overrideComponent(CheckoutComponent, { remove: { imports: [CatalogLayoutComponent] }, add: { schemas: [CUSTOM_ELEMENTS_SCHEMA] } });
    fixture = TestBed.createComponent(CheckoutComponent);
    http = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    http.expectOne('http://localhost:8080/me').flush({ data: { phone: '11912345678' } });
  });
  afterEach(() => {
    fixture.destroy();
    http.verify({ ignoreCancelled: true });
    sessionStorage.removeItem('box.checkout.address.55');
  });
  function load(addresses: unknown[]) { http.expectOne('http://localhost:8080/me/addresses').flush({ data: addresses }); fixture.detectChanges(); }
  function cover() { http.expectOne(r => r.url.endsWith('/shipping/quote')).flush(quote); fixture.detectChanges(); }
  function manual() { load([]); fixture.componentInstance.address.setValue(address, { emitEvent: false }); fixture.componentInstance.checkCoverage(); cover(); }
  it('shows a manual form and a normal unchecked checkbox with no saved addresses', () => {
    load([]);
    expect(fixture.nativeElement.querySelector('#recipient')).not.toBeNull();
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.save-delivery-address input');
    expect(checkbox.checked).toBeFalse();
    expect(parseFloat(getComputedStyle(checkbox).width)).toBe(18);
    expect(parseFloat(getComputedStyle(checkbox).height)).toBe(18);
  });
  it('recalculates freight and total on CEP changes without retaining an old quote', () => {
    load([saved]); cover(); const c=fixture.componentInstance;
    expect(c.checkoutTotal()).toBe(35);
    c.selectAddress(0); c.address.controls.zipCode.setValue('87502100', {emitEvent:false}); c.checkCoverage();
    expect(c.deliveryQuote()).toBeNull();
    http.expectOne(r=>r.url.endsWith('/shipping/quote')).flush({priceCents:1290,minDays:1,maxDays:2});fixture.detectChanges();
    expect(c.checkoutTotal()).toBe(37.9);
    expect(fixture.nativeElement.querySelector('.price-details').textContent).toContain('12,90');
    c.address.controls.zipCode.setValue('99999999',{emitEvent:false});c.checkCoverage();
    http.expectOne(r=>r.url.endsWith('/shipping/quote')).flush({}, {status:404,statusText:'Not found'});
    expect(c.deliveryQuote()).toBeNull();expect(c.deliveryCovered()).toBeFalse();
  });
  it('includes changes to the products subtotal in the total with freight', () => {
    const subtotal=signal(25);spyOn(TestBed.inject(CartService),'total').and.callFake(subtotal);
    load([saved]);cover();expect(fixture.componentInstance.checkoutTotal()).toBe(35);
    subtotal.set(50);expect(fixture.componentInstance.checkoutTotal()).toBe(60);
  });
  it('submits card installments and keeps Pix in a single installment', () => {
    load([saved]);cover();const c=fixture.componentInstance;c.payment.setValue('card');c.installments.setValue(6);
    expect(c.paymentCount()).toBe(6);expect(c.planLabel()).toContain('sem juros');
    c.next();c.next();c.confirm();const request=http.expectOne('http://localhost:8080/checkout');expect(request.request.body.installments).toBe(6);
    request.flush({success:true,data:{id:7,total:35,status:'simulated_approved',installments:6}});
    c.payment.setValue('pix');expect(c.paymentCount()).toBe(1);
  });
  it('blocks invalid card plans without sending a checkout request', () => {
    load([saved]);cover();const c=fixture.componentInstance;c.payment.setValue('card');c.installments.setValue(7);c.next();expect(c.step()).toBe(1);http.expectNone(r=>r.method==='POST');
  });
  it('selects a single non-default address without showing the form', () => {
    load([saved]); cover();
    expect(fixture.componentInstance.selectedAddressId()).toBe(41);
    expect(fixture.nativeElement.querySelector('#recipient')).toBeNull();
    expect(fixture.nativeElement.querySelector('.saved-address-card.selected').textContent).toContain('Pessoa Teste');
  });
  it('prefers the default and uses only the currently selected address in the order', () => {
    load([saved, { ...saved, id: 72, label: 'Trabalho', isDefault: true }]); cover();
    const c = fixture.componentInstance;
    expect(c.selectedAddressId()).toBe(72);
    c.selectAddress(41); cover(); c.next(); c.next(); c.confirm();
    const request = http.expectOne('http://localhost:8080/checkout');
    expect(request.request.body.addressId).toBe(41);
    expect(request.request.body.expectedTotalCents).toBe(3500);
    expect(request.request.body.address).toBeUndefined();
    expect(request.request.body.saveAddress).toBeUndefined();
    request.flush({ success: true, data: { id: 7, total: 35, status: 'simulated_approved' } });
  });
  it('restores only the selected ID and revalidates it against the account on reload', () => {
    load([saved, { ...saved, id: 72, isDefault: true }]); cover();
    fixture.componentInstance.selectAddress(41); cover(); fixture.destroy();
    fixture = TestBed.createComponent(CheckoutComponent);
    http.expectOne('http://localhost:8080/me').flush({ data: { phone: '11912345678' } });
    load([saved, { ...saved, id: 72, isDefault: true }]); cover();
    expect(fixture.componentInstance.selectedAddressId()).toBe(41);
    expect(sessionStorage.getItem('box.checkout.address.55')).not.toContain('Pessoa Teste');
  });
  it('does not treat a loading failure as an empty account and allows retry', () => {
    http.expectOne('http://localhost:8080/me/addresses').flush({}, { status: 503, statusText: 'Unavailable' }); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar seus endereços');
    expect(fixture.nativeElement.querySelector('#recipient')).toBeNull();
    fixture.componentInstance.next(); expect(fixture.componentInstance.step()).toBe(1);
    fixture.componentInstance.retryAddresses(); load([saved]); cover();
    expect(fixture.componentInstance.selectedAddressId()).toBe(41);
  });
  it('rejects an invalid address response without treating it as an empty list', () => {
    http.expectOne('http://localhost:8080/me/addresses').flush({ data: null }); fixture.detectChanges();
    expect(fixture.componentInstance.addressesError()).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#recipient')).toBeNull();
  });
  it('clears a backend coverage error after a successful retry', () => {
    load([saved]); cover(); const c = fixture.componentInstance;
    c.next(); c.next(); c.confirm();
    http.expectOne('http://localhost:8080/checkout').flush({ success: false, message: 'Entrega indisponível para este CEP no momento.' }, { status: 422, statusText: 'Unprocessable Entity' });
    expect(c.step()).toBe(1); expect(c.error()).toBeTruthy();
    c.checkCoverage(); cover(); expect(c.error()).toBe(''); expect(c.deliveryCovered()).toBeTrue();
  });
  it('cancels older address requests', () => {
    const old = http.expectOne('http://localhost:8080/me/addresses');
    fixture.componentInstance.retryAddresses(); expect(old.cancelled).toBeTrue();
    load([]); expect(fixture.componentInstance.savedAddresses()).toEqual([]);
  });
  it('cancels coverage from an old selection and blocks an uncovered saved address', () => {
    load([saved, { ...saved, id: 72, zipCode: '13010-000' }]);
    const old = http.expectOne(r => r.url.endsWith('/shipping/quote'));
    fixture.componentInstance.selectAddress(72); expect(old.cancelled).toBeTrue();
    http.expectOne(r => r.params.get('cep') === '13010000').flush({}, { status: 404, statusText: 'Not Found' });
    fixture.componentInstance.next(); expect(fixture.componentInstance.step()).toBe(1);
    expect(fixture.componentInstance.coverageMessage()).toContain('Entrega indisponível');
    fixture.componentInstance.checkCoverage();
    http.expectOne(r => r.url.endsWith('/shipping/quote')).flush(quote);
    fixture.componentInstance.next(); expect(fixture.componentInstance.step()).toBe(2);
  });
  it('distinguishes an invalid CEP and a temporary coverage failure', () => {
    load([]); const c = fixture.componentInstance;
    c.address.controls.zipCode.setValue('123'); c.next();
    http.expectNone(r => r.url.endsWith('/shipping/quote'));
    expect(c.step()).toBe(1);
    c.address.setValue(address, { emitEvent: false }); c.checkCoverage();
    http.expectOne(r => r.url.endsWith('/shipping/quote')).flush({}, { status: 503, statusText: 'Unavailable' });
    expect(c.coverageMessage()).toContain('Não foi possível consultar');
    expect(c.deliveryCovered()).toBeFalse();
  });
  for (const save of [false, true]) it('keeps manual delivery and opt-in saving through back/forward navigation: ' + save, () => {
    manual(); const c = fixture.componentInstance; c.saveAddress.setValue(save);
    c.next(); c.step.set(1); expect(c.address.getRawValue()).toEqual(address); c.next(); c.next(); c.confirm();
    const request = http.expectOne('http://localhost:8080/checkout');
    expect(request.request.body.address).toEqual(address);
    expect(request.request.body.addressId).toBeUndefined();
    expect(request.request.body.saveAddress).toBe(save ? true : undefined);
    request.flush({}, { status: 503, statusText: 'Unavailable' }); c.confirm();
    const retry = http.expectOne('http://localhost:8080/checkout');
    expect(retry.request.body.requestKey).toBe(request.request.body.requestKey);
    retry.flush({ success: true, data: { id: 7, total: 35, status: 'simulated_approved' } });
  });
});
