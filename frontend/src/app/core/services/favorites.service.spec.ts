import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { FavoritesService } from './favorites.service';
import { Product } from '../../shared/models';

const url = 'http://localhost:8080/favorites';
const product = (id: number) =>
  ({
    id,
    name: `Produto ${id}`,
    price: 10,
    quantity: 2,
    status: 'active',
    measurements: {},
  }) as Product;
const page = (ids: number[], offset = 0, total = ids.length, limit = 100) => ({
  items: ids.map(product),
  pagination: { offset, limit, total, hasMore: offset + ids.length < total },
});

describe('FavoritesService session and concurrency', () => {
  let service: FavoritesService;
  let http: HttpTestingController;
  let token: string | null;
  let changed: Subject<void>;
  let router: jasmine.SpyObj<Router>;
  let unauthorized: jasmine.Spy;
  beforeEach(() => {
    token = null;
    changed = new Subject<void>();
    router = jasmine.createSpyObj('Router', ['navigate']);
    unauthorized = jasmine.createSpy('handleUnauthorized').and.callFake(() => {
      token = null;
      changed.next();
    });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
        {
          provide: AuthService,
          useValue: {
            getToken: () => token,
            userChanged: changed,
            handleUnauthorized: unauthorized,
          },
        },
      ],
    });
    service = TestBed.inject(FavoritesService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function login(ids: number[] = []) {
    token = 'session-a';
    changed.next();
    http.expectOne((r) => r.url === url).flush(page(ids));
  }
  it('redirects guests without mutating or persisting anonymous favorites', () => {
    service.toggle(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    http.expectNone((r) => r.url.startsWith(url));
  });
  it('publishes all pages atomically and keeps off-page hearts selected', () => {
    token = 'session-a';
    changed.next();
    const first = http.expectOne((r) => r.url === url);
    expect(first.request.params.get('limit')).toBe('100');
    first.flush(page([1], 0, 2));
    expect(service.synchronized()).toBeFalse();
    expect(service.ids().size).toBe(0);
    service.toggle(1);
    http.expectNone(`${url}/1`);
    const second = http.expectOne((r) => r.url === url);
    expect(second.request.params.get('offset')).toBe('1');
    second.flush(page([101], 1, 2));
    expect(service.isFavorite(1)).toBeTrue();
    expect(service.isFavorite(101)).toBeTrue();
    service.toggle(101);
    service.toggle(101);
    const remove = http.expectOne(`${url}/101`);
    expect(remove.request.method).toBe('DELETE');
    expect(service.isFavorite(101)).toBeTrue();
    remove.flush({ success: true, data: { productId: 101, favorited: false } });
    expect(service.isFavorite(101)).toBeFalse();
    expect(service.isFavorite(1)).toBeTrue();
  });
  it('does not publish a partial set when a later page fails and supports retry', () => {
    token = 'session-a';
    changed.next();
    http.expectOne((r) => r.url === url).flush(page([1], 0, 2));
    http
      .expectOne((r) => r.url === url)
      .flush({ message: 'Falha' }, { status: 500, statusText: 'Error' });
    expect(service.ids().size).toBe(0);
    expect(service.synchronized()).toBeFalse();
    expect(service.loading()).toBeFalse();
    service.synchronize();
    http.expectOne((r) => r.url === url).flush(page([2]));
    expect(service.synchronized()).toBeTrue();
    expect(service.isFavorite(2)).toBeTrue();
    expect(service.syncError()).toBe('');
  });
  it('serializes mutations, blocks duplicate clicks and preserves confirmed state on failure', () => {
    login([1]);
    service.toggle(1);
    service.toggle(1);
    service.toggle(2);
    const first = http.expectOne(`${url}/1`);
    http.expectNone(`${url}/2`);
    first.flush(
      { message: 'Sem conexao' },
      { status: 500, statusText: 'Error' },
    );
    expect(service.isFavorite(1)).toBeTrue();
    expect(service.pending().has(1)).toBeFalse();
    expect(service.errors()[1]).toBe('Sem conexao');
    http
      .expectOne(`${url}/2`)
      .flush({ success: true, data: { productId: 2, favorited: true } });
    expect(service.isFavorite(2)).toBeTrue();
  });
  it('cancels reads and mutations and clears the previous account on session changes', () => {
    token = 'session-a';
    changed.next();
    const oldRead = http.expectOne((r) => r.url === url);
    token = 'session-b';
    changed.next();
    expect(oldRead.cancelled).toBeTrue();
    http.expectOne((r) => r.url === url).flush(page([2]));
    service.toggle(2);
    const oldWrite = http.expectOne(`${url}/2`);
    token = null;
    changed.next();
    expect(oldWrite.cancelled).toBeTrue();
    expect(service.ids().size).toBe(0);
    expect(service.pending().size).toBe(0);
    expect(service.page()).toBeNull();
    expect(service.synchronized()).toBeFalse();
    expect(service.loading()).toBeFalse();
    token = 'session-c';
    changed.next();
    http.expectOne((r) => r.url === url).flush(page([3]));
    expect([...service.ids()]).toEqual([3]);
  });
  it('handles 401 without leaving another session data or pending actions', () => {
    login([1]);
    service.toggle(1);
    http
      .expectOne(`${url}/1`)
      .flush(
        { message: 'Sessao expirada' },
        { status: 401, statusText: 'Unauthorized' },
      );
    expect(unauthorized).toHaveBeenCalledWith('session-a');
    expect(service.ids().size).toBe(0);
    expect(service.pending().size).toBe(0);
  });
  it('refills a removed last page and moves to the previous valid page', () => {
    login([21]);
    service.openPage();
    http.expectOne((r) => r.url === url).flush(page([1], 0, 21, 20));
    service.loadPage(20);
    http.expectOne((r) => r.url === url).flush(page([21], 20, 21, 20));
    service.remove(21);
    http
      .expectOne(`${url}/21`)
      .flush({ data: { productId: 21, favorited: false } });
    const empty = http.expectOne((r) => r.url === url);
    expect(empty.request.params.get('offset')).toBe('20');
    empty.flush(page([], 20, 20, 20));
    expect(service.pageLoading()).toBeTrue();
    const corrected = http.expectOne((r) => r.url === url);
    expect(corrected.request.params.get('offset')).toBe('0');
    corrected.flush(
      page(
        Array.from({ length: 20 }, (_, i) => i + 1),
        0,
        20,
        20,
      ),
    );
    expect(service.page()?.pagination.offset).toBe(0);
    expect(service.pageLoading()).toBeFalse();
    expect(service.isFavorite(21)).toBeFalse();
  });
  it('does not let an earlier page read overwrite a confirmed mutation', () => {
    login([1]);
    service.openPage();
    const read = http.expectOne((r) => r.url === url);
    service.toggle(1);
    http.expectNone(`${url}/1`);
    read.flush(page([1], 0, 1, 20));
    http
      .expectOne(`${url}/1`)
      .flush({ data: { productId: 1, favorited: false } });
    http.expectOne((r) => r.url === url).flush(page([], 0, 0, 20));
    expect(service.isFavorite(1)).toBeFalse();
    expect(service.page()?.items).toEqual([]);
  });
});
