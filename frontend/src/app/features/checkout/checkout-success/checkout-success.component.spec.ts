import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { CatalogLayoutComponent } from '../../catalog/components/catalog-layout/catalog-layout.component';
import { CheckoutSuccessComponent } from './checkout-success.component';

describe('CheckoutSuccessComponent', () => {
  function setup() {
    const paramMap = convertToParamMap({ id: '7' });
    TestBed.configureTestingModule({
      imports: [CheckoutSuccessComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(paramMap), snapshot: { paramMap } } },
        { provide: AuthService, useValue: { userChanged: NEVER } },
      ],
    }).overrideComponent(CheckoutSuccessComponent, {
      remove: { imports: [CatalogLayoutComponent] },
      add: { schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });
    const fixture = TestBed.createComponent(CheckoutSuccessComponent);
    const http = TestBed.inject(HttpTestingController);
    const lookup = { method: 'GET', url: 'http://localhost:8080/checkout/success/7' };
    return { fixture, http, lookup };
  }

  for (const reason of ['missing order', 'order owned by another user']) {
    it('shows only a store link for a 404 (' + reason + ')', () => {
      const { fixture, http, lookup } = setup();
      http.expectOne(lookup).flush(null, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();
      const page: HTMLElement = fixture.nativeElement;
      expect(page.querySelector('h1')?.textContent).toBe('Pedido não encontrado');
      expect(page.querySelectorAll('a, button').length).toBe(1);
      expect(page.querySelector('a')?.getAttribute('href')).toBe('/home');
      expect(page.querySelector('.order-strip')).toBeNull();
      http.verify();
    });
  }

  it('retries a connection failure using only GET and shows the confirmed order', () => {
    const { fixture, http, lookup } = setup();
    http.expectOne(lookup).error(new ProgressEvent('error'));
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível');
    expect(page.querySelectorAll('a, button').length).toBe(1);
    page.querySelector('button')!.click();
    http.expectOne(lookup).flush({ success: true, data: { id: 7, total: 25, status: 'simulated_approved' } });
    fixture.detectChanges();
    expect(page.textContent).toContain('Seu pedido foi realizado!');
    expect(page.querySelectorAll('a, button').length).toBe(1);
    http.verify();
  });
});
