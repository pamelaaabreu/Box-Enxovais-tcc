import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideNgxMask } from 'ngx-mask';
import { ShippingQuoteComponent } from './shipping-quote.component';
describe('ShippingQuoteComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [ShippingQuoteComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNgxMask(),
      ],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('rejects invalid CEP and cancels stale requests', () => {
    const f = TestBed.createComponent(ShippingQuoteComponent),
      p = f.componentInstance,
      http = TestBed.inject(HttpTestingController);
    p.changeCep('123');
    p.calculate();
    http.expectNone(() => true);
    expect(p.invalid()).toBeTrue();
    p.changeCep('01001000');
    p.calculate();
    const old = http.expectOne((r) => r.url.endsWith('/shipping/quote'));
    p.changeCep('02002000');
    expect(old.cancelled).toBeTrue();
    p.calculate();
    const next = http.expectOne((r) => r.url.endsWith('/shipping/quote'));
    f.destroy();
    expect(next.cancelled).toBeTrue();
  });
});
