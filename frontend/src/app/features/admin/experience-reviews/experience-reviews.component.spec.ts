import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ExperienceReviewsComponent } from './experience-reviews.component';
import { CustomAlertService } from '../../../core/services/custom-alert.service';
describe('ExperienceReviewsComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [ExperienceReviewsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: CustomAlertService,
          useValue: { success: () => {}, error: () => {} },
        },
      ],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('cancels old reads and renders a real empty response', () => {
    const f = TestBed.createComponent(ExperienceReviewsComponent),
      http = TestBed.inject(HttpTestingController);
    const old = http.expectOne(
      'http://localhost:8080/admin/experience-reviews',
    );
    f.componentInstance.load();
    expect(old.cancelled).toBeTrue();
    http.expectOne('http://localhost:8080/admin/experience-reviews').flush([]);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Nenhuma avaliação recebida');
    f.componentInstance.load();
    const pending = http.expectOne(
      'http://localhost:8080/admin/experience-reviews',
    );
    f.destroy();
    expect(pending.cancelled).toBeTrue();
  });
  it('reuses moderation actions for products and sends the reviewed version timestamp', () => {
    const fixture = TestBed.createComponent(ExperienceReviewsComponent),
      http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:8080/admin/experience-reviews').flush([]);
    fixture.componentInstance.changeKind('product');
    const product = {
      id: 7,
      productId: 1,
      productName: 'Edredom',
      rating: 5,
      comment: 'Ótimo',
      publicationConsent: true,
      status: 'pending',
      createdAt: '2026-11-24T00:00:00Z',
      updatedAt: '2026-11-24T00:00:00Z',
    };
    http
      .expectOne('http://localhost:8080/admin/product-reviews')
      .flush([product]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Edredom');
    fixture.componentInstance.moderate(
      fixture.componentInstance.reviews()[0],
      'approved',
    );
    const request = http.expectOne(
      'http://localhost:8080/admin/product-reviews/7',
    );
    expect(request.request.body).toEqual({
      status: 'approved',
      expectedUpdatedAt: product.updatedAt,
    });
    request.flush({});
    http
      .expectOne('http://localhost:8080/admin/product-reviews')
      .flush([{ ...product, status: 'approved' }]);
  });
});
