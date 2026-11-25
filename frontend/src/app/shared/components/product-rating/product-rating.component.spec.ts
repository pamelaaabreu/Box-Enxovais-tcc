import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ProductRatingComponent } from './product-rating.component';
describe('ProductRatingComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('displays fractional stars, real count and Portuguese average', fakeAsync(() => {
    const fixture = TestBed.createComponent(ProductRatingComponent);
    fixture.componentRef.setInput('productId', 1);
    fixture.detectChanges();
    flushMicrotasks();
    TestBed.inject(HttpTestingController)
      .expectOne((req) => req.url.endsWith('/products/review-summaries'))
      .flush({ 1: { average: 4.8, count: 12 } });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('4,8 (12 avaliações)');
    expect(
      fixture.nativeElement
        .querySelector('[role=img]')
        .getAttribute('aria-label'),
    ).toContain('4,8 de 5 estrelas');
    expect(fixture.nativeElement.querySelector('.stars>span').style.width).toBe(
      '96%',
    );
  }));
  it('keeps a reserved compact line for products without reviews', fakeAsync(() => {
    const fixture = TestBed.createComponent(ProductRatingComponent);
    fixture.componentRef.setInput('productId', 1);
    fixture.detectChanges();
    flushMicrotasks();
    TestBed.inject(HttpTestingController)
      .expectOne((req) => req.url.endsWith('/products/review-summaries'))
      .flush({ 1: { average: 0, count: 0 } });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sem avaliações');
    expect(
      parseFloat(getComputedStyle(fixture.nativeElement).minHeight),
    ).toBeGreaterThanOrEqual(22);
  }));
});
