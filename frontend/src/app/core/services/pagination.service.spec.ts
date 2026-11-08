import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PaginationService } from './pagination.service';
import { ProductService } from './product.service';
import { PromoService } from './promo.service';

describe('PaginationService', () => {
  let service: PaginationService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PaginationService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('sends offset, limit and filters and preserves metadata', () => {
    service.getPage<number>('/products', { offset: 5, limit: 2, filters: { stock__gte: 1, name__contains: 'cama & banho' } })
      .subscribe(page => expect(page.pagination.total).toBe(8));
    const req = http.expectOne(r => r.url === '/products');
    expect(req.request.params.get('offset')).toBe('5');
    expect(req.request.params.get('limit')).toBe('2');
    expect(req.request.params.get('stock__gte')).toBe('1');
    expect(req.request.params.get('name__contains')).toBe('cama & banho');
    req.flush({ items: [6, 7], pagination: { offset: 5, limit: 2, total: 8, hasMore: true } });
  });

  it('loads every page for existing collection consumers without truncation', () => {
    let result: number[] | undefined;
    service.getAll<number>('/products', { stock__gte: 1 }).subscribe(items => result = items);
    http.expectOne(r => r.params.get('offset') === '0')
      .flush({ items: [1, 2], pagination: { offset: 0, limit: 2, total: 3, hasMore: true } });
    expect(result).toBeUndefined();
    const next = http.expectOne(r => r.params.get('offset') === '2');
    expect(next.request.params.get('stock__gte')).toBe('1');
    next.flush({ items: [3], pagination: { offset: 2, limit: 2, total: 3, hasMore: false } });
    expect(result).toEqual([1, 2, 3]);
  });

  it('returns an empty collection and does not request another page', () => {
    service.getAll('/products').subscribe(items => expect(items).toEqual([]));
    http.expectOne(r => r.url === '/products')
      .flush({ items: [], pagination: { offset: 0, limit: 100, total: 0, hasMore: false } });
  });

  it('propagates failures without presenting a partial collection as complete', () => {
    service.getAll('/products').subscribe({ next: () => fail('partial result'), error: err => expect(err.status).toBe(500) });
    http.expectOne(r => r.params.get('offset') === '0')
      .flush({ items: [1], pagination: { offset: 0, limit: 1, total: 2, hasMore: true } });
    http.expectOne(r => r.params.get('offset') === '1').flush({}, { status: 500, statusText: 'Server error' });
  });

  it('reads legacy promotional arrays without accessing missing pagination', () => {
    TestBed.inject(PromoService).getPromotionalProducts('Ofertas de Inverno')
      .subscribe(items => expect(items.map(item => item.id)).toEqual([1, 2]));
    http.expectOne(r => r.url.endsWith('/Ofertas%20de%20Inverno')).flush([{ id: 1 }, { id: 2 }]);
  });

  it('treats the legacy null response as an empty collection', () => {
    service.getAll('/promotions').subscribe(items => expect(items).toEqual([]));
    http.expectOne(r => r.url === '/promotions').flush(null);
  });

  it('paginates legacy arrays without repeating or dropping products', () => {
    const items = Array.from({ length: 105 }, (_, i) => i);
    service.getAll<number>('/products').subscribe(result => expect(result).toEqual(items));
    http.expectOne(r => r.params.get('offset') === '0').flush(items);
    http.expectOne(r => r.params.get('offset') === '100').flush(items);
  });

  it('rejects malformed responses with an explicit error instead of an empty list', () => {
    for (const response of [{ items: [] }, {}, { items: [], pagination: { hasMore: true } }]) {
      service.getAll('/products').subscribe({
        next: () => fail('invalid response accepted'),
        error: err => expect(err.message).toContain('Resposta inválida da API'),
      });
      http.expectOne(r => r.url === '/products').flush(response);
    }
  });

  it('adapts product/promotional services and leaves detail requests singular', () => {
    TestBed.inject(ProductService).getProducts().subscribe(items => expect(items.length).toBe(1));
    http.expectOne(r => r.url.endsWith('/products')).flush({ items: [{ id: 1 }], pagination: { offset: 0, limit: 100, total: 1, hasMore: false } });
    TestBed.inject(PromoService).getPromotionalProducts('Casa & banho').subscribe(items => expect(items).toEqual([]));
    http.expectOne(r => r.url.endsWith('/Casa%20%26%20banho')).flush({ items: [], pagination: { offset: 0, limit: 100, total: 0, hasMore: false } });
    TestBed.inject(ProductService).getProduct(1).subscribe(product => expect(product.id).toBe(1));
    http.expectOne('http://localhost:8080/products/1').flush({ id: 1 });
  });
});
