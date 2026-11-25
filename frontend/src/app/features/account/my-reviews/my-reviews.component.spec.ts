import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { MyReviewsComponent } from './my-reviews.component';
describe('MyReviewsComponent', () => {
  const review = {
    id: 7,
    productId: 1,
    productName: 'Edredom',
    imagePath: 'uploads/test.jpg',
    rating: 3,
    comment: 'Bom',
    publicationConsent: true,
    status: 'approved',
    createdAt: '2026-11-24T00:00:00Z',
    updatedAt: '2026-11-24T00:00:00Z',
    canEdit: true,
  };
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
  function load(items: unknown[] = [review]) {
    const fixture = TestBed.createComponent(MyReviewsComponent);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:8080/me/product-reviews').flush(items);
    http.expectOne('http://localhost:8080/me/review-products').flush([]);
    fixture.detectChanges();
    return { fixture, http, root: fixture.nativeElement as HTMLElement };
  }
  it('lists owned reviews and pre-fills the existing review for PATCH instead of POST', () => {
    const { fixture, http, root } = load();
    expect(root.textContent).toContain('Edredom');
    expect(root.querySelector('img')?.getAttribute('src')).toContain(
      'uploads/test.jpg',
    );
    root.querySelector<HTMLButtonElement>('.review-footer button')!.click();
    fixture.detectChanges();
    const comment = root.querySelector<HTMLTextAreaElement>('textarea')!;
    expect(comment.value).toBe('Bom');
    expect(
      root.querySelectorAll<HTMLInputElement>('input[type=radio]')[2].checked,
    ).toBeTrue();
    comment.value = 'Mais detalhes';
    comment.dispatchEvent(new Event('input'));
    root
      .querySelector<HTMLFormElement>('form')!
      .dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    const request = http.expectOne(
      'http://localhost:8080/me/product-reviews/7',
    );
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body.comment).toBe('Mais detalhes');
    request.flush({});
    http
      .expectOne('http://localhost:8080/me/product-reviews')
      .flush([{ ...review, comment: 'Mais detalhes', status: 'pending' }]);
    http.expectOne('http://localhost:8080/me/review-products').flush([]);
    fixture.detectChanges();
    expect(fixture.componentInstance.reviews().length).toBe(1);
    expect(root.textContent).toContain('Mais detalhes');
    expect(root.textContent).toContain('Aguardando moderação');
  });
  it('uses the shared empty state', () => {
    const { root } = load([]);
    expect(root.querySelector('app-admin-state')).not.toBeNull();
    expect(root.textContent).toContain('Você ainda não avaliou');
  });
  it('uses the shared error state and supports reload', () => {
    const fixture = TestBed.createComponent(MyReviewsComponent);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('http://localhost:8080/me/product-reviews')
      .flush({}, { status: 500, statusText: 'Error' });
    http.match('http://localhost:8080/me/review-products');
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('app-admin-state'),
    ).not.toBeNull();
    expect(fixture.componentInstance.error()).toBeTrue();
  });
});
