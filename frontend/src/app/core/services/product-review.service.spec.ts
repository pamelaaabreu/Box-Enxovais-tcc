import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ProductReviewService } from './product-review.service';
describe('ProductReviewService', () => {
  let service: ProductReviewService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductReviewService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('batches and deduplicates summaries for every card in the render cycle', fakeAsync(() => {
    service.ensureSummary(1);
    service.ensureSummary(2);
    service.ensureSummary(1);
    flushMicrotasks();
    const request = http.expectOne((req) =>
      req.url.endsWith('/products/review-summaries'),
    );
    expect(request.request.params.get('ids')).toBe('1,2');
    request.flush({
      1: { average: 4.8, count: 12 },
      2: { average: 0, count: 0 },
    });
    expect(service.summaries()[1].average).toBe(4.8);
    expect(service.summaries()[2].count).toBe(0);
    service.ensureSummary(1);
    flushMicrotasks();
    http.expectNone((req) => req.url.endsWith('/products/review-summaries'));
  }));
  it('does not show zero ratings on an API failure and supports retry', fakeAsync(() => {
    service.ensureSummary(1);
    flushMicrotasks();
    http
      .expectOne((req) => req.url.endsWith('/products/review-summaries'))
      .flush({}, { status: 500, statusText: 'Error' });
    expect(service.summaries()[1].error).toBeTrue();
    service.ensureSummary(1, true);
    flushMicrotasks();
    http
      .expectOne((req) => req.url.endsWith('/products/review-summaries'))
      .flush({ 1: { average: 5, count: 1 } });
    expect(service.summaries()[1].error).toBeFalse();
  }));
  it('invalidates summaries after editing and ignores an older in-flight response', fakeAsync(() => {
    service.ensureSummary(1);
    flushMicrotasks();
    const stale = http.expectOne((req) =>
      req.url.endsWith('/products/review-summaries'),
    );
    let changed = 0;
    service.changed.subscribe(() => changed++);
    service
      .update(77, { rating: 2, comment: 'Editado', publicationConsent: true })
      .subscribe();
    const edit = http.expectOne('http://localhost:8080/me/product-reviews/77');
    expect(edit.request.method).toBe('PATCH');
    edit.flush({});
    flushMicrotasks();
    const fresh = http.expectOne((req) =>
      req.url.endsWith('/products/review-summaries'),
    );
    fresh.flush({ 1: { average: 2, count: 1 } });
    stale.flush({ 1: { average: 5, count: 1 } });
    expect(service.summaries()[1].average).toBe(2);
    expect(changed).toBe(1);
  }));
});
