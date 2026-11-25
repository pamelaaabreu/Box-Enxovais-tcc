import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PurchaseReviewComponent } from './purchase-review.component';

describe('PurchaseReviewComponent', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify({ ignoreCancelled: true }));
  function create() {
    const f = TestBed.createComponent(PurchaseReviewComponent);
    f.componentRef.setInput('orderId', 1);
    f.detectChanges();
    return f;
  }
  function setup(existing: { status: string } | null = null) {
    const f = create();
    http.expectOne('http://localhost:8080/orders/1/review').flush(existing);
    f.detectChanges();
    return f;
  }
  it('requires just one rating and does not show validation errors initially', () => {
    const f = setup();
    expect(f.nativeElement.querySelector('small')).toBeNull();
    f.componentInstance.submit();
    f.detectChanges();
    expect(f.nativeElement.querySelectorAll('small').length).toBe(1);
    http.expectNone((r) => r.method === 'POST');
  });
  for (const rating of [1, 2, 3, 4, 5])
    it(
      'sends rating ' +
        rating +
        ' with an optional blank comment and no invented auxiliary scores',
      () => {
        const f = setup();
        f.nativeElement
          .querySelectorAll('input[type=radio]')
          [rating - 1].click();
        f.componentInstance.submit();
        f.componentInstance.submit();
        const req = http.expectOne((r) => r.method === 'POST');
        expect(req.request.body).toEqual({
          overall: rating,
          comment: '',
          publicationConsent: false,
        });
        req.flush({});
        f.detectChanges();
        expect(f.nativeElement.querySelector('form')).toBeNull();
        expect(f.nativeElement.querySelectorAll('[role=status]').length).toBe(
          1,
        );
        expect(f.nativeElement.textContent).toContain('Obrigado por avaliar');
      },
    );
  it('preserves all entered values on HTTP failure and permits a single retry', () => {
    const f = setup();
    const c = f.componentInstance;
    c.form.setValue({
      overall: 5,
      comment: 'Boa compra',
      publicationConsent: true,
    });
    c.submit();
    http
      .expectOne((r) => r.method === 'POST')
      .flush(
        { message: 'Tente novamente' },
        { status: 503, statusText: 'Unavailable' },
      );
    f.detectChanges();
    expect(c.form.getRawValue()).toEqual({
      overall: 5,
      comment: 'Boa compra',
      publicationConsent: true,
    });
    expect(c.sending()).toBeFalse();
    expect(f.nativeElement.querySelector('[role=alert]')).not.toBeNull();
    c.submit();
    http.expectOne((r) => r.method === 'POST').flush({});
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role=alert]')).toBeNull();
  });
  it('consults the real state on reload and hides the form for an existing review', () => {
    const f = setup({ status: 'pending' });
    expect(f.nativeElement.querySelector('form')).toBeNull();
    expect(f.nativeElement.textContent).toContain('Você já avaliou');
    f.destroy();
    const again = setup({ status: 'approved' });
    expect(again.nativeElement.querySelector('form')).toBeNull();
  });
  it('reconciles a simultaneous submission with GET after HTTP 409', () => {
    const f = setup();
    f.componentInstance.form.controls.overall.setValue(4);
    f.componentInstance.submit();
    http
      .expectOne((r) => r.method === 'POST')
      .flush({}, { status: 409, statusText: 'Conflict' });
    http
      .expectOne('http://localhost:8080/orders/1/review')
      .flush({ status: 'pending' });
    f.detectChanges();
    expect(f.nativeElement.querySelector('form')).toBeNull();
  });
  it('rejects an oversized comment without posting', () => {
    const f = setup();
    f.componentInstance.form.setValue({
      overall: 4,
      comment: 'a'.repeat(1001),
      publicationConsent: false,
    });
    f.componentInstance.submit();
    expect(
      f.componentInstance.form.controls.comment.hasError('maxlength'),
    ).toBeTrue();
    http.expectNone((r) => r.method === 'POST');
  });
  it('retries a read error without losing the draft', () => {
    const f = create();
    f.componentInstance.form.controls.comment.setValue('Rascunho');
    http
      .expectOne('http://localhost:8080/orders/1/review')
      .flush({}, { status: 500, statusText: 'Error' });
    f.detectChanges();
    f.nativeElement.querySelector('[role=alert] button').click();
    http.expectOne('http://localhost:8080/orders/1/review').flush(null);
    f.detectChanges();
    expect(f.componentInstance.form.controls.comment.value).toBe('Rascunho');
  });
  it('does not offer a form for an ineligible or foreign order', () => {
    const f = create();
    http
      .expectOne('http://localhost:8080/orders/1/review')
      .flush({}, { status: 404, statusText: 'Not Found' });
    f.detectChanges();
    expect(f.nativeElement.querySelector('form')).toBeNull();
    expect(f.nativeElement.textContent).toContain('não está disponível');
  });
  it('cancels stale reads when switching orders and clears the previous draft', () => {
    const f = create();
    const old = http.expectOne('http://localhost:8080/orders/1/review');
    f.componentInstance.form.controls.comment.setValue('Anterior');
    f.componentRef.setInput('orderId', 2);
    f.detectChanges();
    expect(old.cancelled).toBeTrue();
    expect(f.componentInstance.form.controls.comment.value).toBe('');
    f.componentInstance.submit();
    http.expectNone((r) => r.method === 'POST');
    http.expectOne('http://localhost:8080/orders/2/review').flush(null);
  });
  it('cancels a stale write instead of marking another order as reviewed', () => {
    const f = setup();
    f.componentInstance.form.controls.overall.setValue(5);
    f.componentInstance.submit();
    const post = http.expectOne((r) => r.method === 'POST');
    f.componentRef.setInput('orderId', 2);
    f.detectChanges();
    expect(post.cancelled).toBeTrue();
    http.expectOne('http://localhost:8080/orders/2/review').flush(null);
    f.detectChanges();
    expect(f.componentInstance.saved()).toBe('');
    expect(f.nativeElement.querySelector('form')).not.toBeNull();
  });
  it('cancels the pending read when destroyed', () => {
    const f = create();
    const req = http.expectOne('http://localhost:8080/orders/1/review');
    f.destroy();
    expect(req.cancelled).toBeTrue();
  });
});
