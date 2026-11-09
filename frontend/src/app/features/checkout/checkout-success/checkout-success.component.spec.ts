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
  it('opens directly by id, handles lookup failure and retries only GET', () => {
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
    http.expectOne(lookup).flush(null, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Pedido não encontrado.');
    fixture.nativeElement.querySelector('button').click();
    http.expectOne(lookup).flush({ success: true, data: { id: 7, total: 25, status: 'simulated_approved' } });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Seu pedido foi realizado!');
    http.verify();
  });
});
