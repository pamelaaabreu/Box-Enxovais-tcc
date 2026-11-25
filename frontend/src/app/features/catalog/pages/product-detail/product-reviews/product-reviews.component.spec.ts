import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ProductReviewService } from '../../../../../core/services/product-review.service';
import { ProductReviewsComponent } from './product-reviews.component';
describe('ProductReviewsComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('reloads the published detail list when a review changes and handles empty data', () => {
    const fixture = TestBed.createComponent(ProductReviewsComponent);
    fixture.componentRef.setInput('productId', 7);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:8080/products/7/reviews').flush([
      {
        id: 1,
        rating: 5,
        comment: 'Ótimo',
        customerName: 'Ana S.',
        createdAt: '2026-11-24T00:00:00Z',
      },
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ótimo');
    TestBed.inject(ProductReviewService)
      .update(1, { rating: 4, comment: 'Editado', publicationConsent: true })
      .subscribe();
    http.expectOne('http://localhost:8080/me/product-reviews/1').flush({});
    http.expectOne('http://localhost:8080/products/7/reviews').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Ótimo');
    expect(
      fixture.nativeElement.querySelector('.empty-average'),
    ).not.toBeNull();
  });
});
