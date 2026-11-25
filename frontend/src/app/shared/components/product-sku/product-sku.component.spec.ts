import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Clipboard } from '@angular/cdk/clipboard';
import { ProductSkuComponent } from './product-sku.component';
import { CustomAlertService } from '../../../core/services/custom-alert.service';

describe('ProductSkuComponent', () => {
  let copy: jasmine.Spy;
  beforeEach(() => {
    copy = jasmine.createSpy().and.returnValue(true);
    TestBed.configureTestingModule({
      imports: [ProductSkuComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Clipboard, useValue: { copy } },
        {
          provide: CustomAlertService,
          useValue: {
            success: jasmine.createSpy(),
            error: jasmine.createSpy(),
          },
        },
      ],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('loads the real SKU as read only and copies it without updating the product', () => {
    const fixture = TestBed.createComponent(ProductSkuComponent);
    fixture.componentRef.setInput('productId', 21);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:8080/products/21')
      .flush({ id: 21, sku: 'BX-TOA-123' });
    fixture.detectChanges();
    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input');
    expect(input.readOnly).toBeTrue();
    expect(input.value).toBe('BX-TOA-123');
    fixture.nativeElement.querySelector('button').click();
    expect(copy).toHaveBeenCalledOnceWith('BX-TOA-123');
    TestBed.inject(HttpTestingController).expectNone(
      (req) => req.method !== 'GET',
    );
  });
  it('retries only the SKU lookup after a communication failure', () => {
    const fixture = TestBed.createComponent(ProductSkuComponent);
    fixture.componentRef.setInput('productId', 21);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('http://localhost:8080/products/21')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tentar novamente');
    fixture.nativeElement.querySelector('button').click();
    http
      .expectOne('http://localhost:8080/products/21')
      .flush({ id: 21, sku: 'BX-TOA-123' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input').value).toBe(
      'BX-TOA-123',
    );
    http.expectNone((req) => req.method !== 'GET');
  });
});
