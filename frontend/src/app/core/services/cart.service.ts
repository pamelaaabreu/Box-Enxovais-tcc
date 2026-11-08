import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  EMPTY,
  Subject,
  catchError,
  concatMap,
  defer,
  finalize,
  takeUntil,
  tap,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from './auth.service';
import { Cart } from '../interfaces/cart.interface';

type CartRequest = {
  method: string;
  path: string;
  body?: unknown;
  key: number;
  productId?: number;
  session: number;
};
const emptyCart = (): Cart => ({ items: [], totalItems: 0, total: 0 });
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly queue = new Subject<CartRequest>();
  private session = 0;
  private readonly state = signal<Cart>(emptyCart());
  readonly cart = this.state.asReadonly();
  readonly totalItems = computed(() => this.cart().totalItems);
  readonly total = computed(() => this.cart().total);
  readonly pending = signal<ReadonlySet<number>>(new Set());
  readonly busy = computed(() => this.pending().size > 0);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly feedback = signal<Record<number, string>>({});

  constructor() {
    // Serial requests prevent an older HTTP response overwriting a newer cart.
    this.queue
      .pipe(
        concatMap((request) =>
          defer(() => {
            if (request.session !== this.session) return EMPTY;
            return this.http
              .request<{
                data: Cart;
              }>(request.method, `http://localhost:8080/cart${request.path}`, { body: request.body })
              .pipe(
                takeUntil(this.auth.userChanged),
                tap((response) => {
                  if (request.session !== this.session) return;
                  const remainingProducts = new Set(response.data.items.map(item => item.productId));
                  const removedProducts = this.cart().items
                    .filter(item => !remainingProducts.has(item.productId))
                    .map(item => item.productId);
                  this.feedback.update(value => {
                    if (request.method === 'DELETE' && request.path === '') return {};
                    const next = { ...value };
                    for (const productId of removedProducts) delete next[productId];
                    return next;
                  });
                  this.state.set(response.data);
                  if (request.productId && request.method !== 'DELETE')
                    this.feedback.update((value) => ({
                      ...value,
                      [request.productId!]: request.method === 'POST' ? 'Adicionado ao carrinho.' : '',
                    }));
                }),
                catchError((error: HttpErrorResponse) => {
                  if (request.session !== this.session) return EMPTY;
                  const message =
                    error.status === 401
                      ? 'Entre na sua conta para acessar o carrinho.'
                      : error.status === 0
                        ? 'Sem conexão. Tente novamente.'
                        : error.error?.message ||
                          'Não foi possível atualizar o carrinho.';
                  this.error.set(message);
                  if (request.productId)
                    this.feedback.update((value) => ({
                      ...value,
                      [request.productId!]: message,
                    }));
                  if (error.status === 401) {
                    this.state.set(emptyCart());
                    void this.router.navigate(['/login']);
                  }
                  return EMPTY;
                }),
                finalize(() => {
                  if (request.session === this.session) {
                    this.pending.update((keys) => {
                      const next = new Set(keys);
                      next.delete(request.key);
                      return next;
                    });
                    if (request.method === 'GET') this.loading.set(false);
                  }
                }),
              );
          }),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();
    this.auth.userChanged.pipe(takeUntilDestroyed()).subscribe(() => {
      this.session++;
      this.state.set(emptyCart());
      this.pending.set(new Set());
      this.loading.set(false);
      this.error.set('');
      this.feedback.set({});
      this.load();
    });
    this.load();
  }
  load(): void {
    if (this.auth.getToken()) this.request('GET', '', -1);
  }
  add(productId: number, quantity = 1): void {
    this.request(
      'POST',
      '/items',
      productId,
      { productId, quantity },
      productId,
    );
  }
  update(id: number, quantity: number): void {
    this.request('PATCH', `/items/${id}`, -id - 1, { quantity }, this.cart().items.find(item => item.id === id)?.productId);
  }
  remove(id: number): void {
    this.request('DELETE', `/items/${id}`, -id - 1, undefined, this.cart().items.find(item => item.id === id)?.productId);
  }
  clear(): void {
    this.request('DELETE', '', 0);
  }
  private request(
    method: string,
    path: string,
    key: number,
    body?: unknown,
    productId?: number,
  ): void {
    if (!this.auth.getToken()) {
      void this.router.navigate(['/login']);
      return;
    }
    if (this.pending().has(key)) return;
    this.error.set('');
    if (productId && method === 'POST')
      this.feedback.update((value) => ({ ...value, [productId]: '' }));
    this.pending.update((keys) => new Set([...keys, key]));
    if (method === 'GET') this.loading.set(true);
    this.queue.next({
      method,
      path,
      key,
      body,
      productId,
      session: this.session,
    });
  }
}
