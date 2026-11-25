import { API_BASE_URL, apiEndpoint } from '../config/api.config';
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  concatMap,
  finalize,
  takeUntil,
  tap,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from './auth.service';
import { PaginationService } from './pagination.service';
import type { Page, PageOptions } from '../../shared/types/api/pagination';
import type { Product } from '../../shared/types/products/product';

import type { FavoriteRequest } from '../../shared/types/favorites/favorite-request';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly baseUrl = inject(API_BASE_URL).replace(/\/+$/, '');
  private readonly http = inject(HttpClient);
  private readonly pagination = inject(PaginationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly url = apiEndpoint(this.baseUrl, 'favorites');

  // Fila de operações.
  private readonly requests = new Subject<FavoriteRequest>();

  // Notifica alterações de sessão.
  private readonly sessionChanged = new Subject<void>();

  private session = 0;
  private pageActive = false;
  private offset = 0;
  private pageRequests = 0;

  // IDs confirmados pelo backend.
  private readonly confirmedIds = signal<ReadonlySet<number>>(new Set());

  readonly ids = this.confirmedIds.asReadonly();

  readonly authenticated = signal(!!this.auth.getToken());
  readonly synchronized = signal(false);
  readonly loading = signal(false);

  readonly pending = signal<ReadonlySet<number>>(new Set());
  readonly errors = signal<Record<number, string>>({});
  readonly syncError = signal('');

  readonly page = signal<Page<Product> | null>(null);
  readonly pageLoading = signal(false);
  readonly pageError = signal('');

  constructor() {
    // Executa as operações sequencialmente.
    this.requests
      .pipe(
        concatMap((request) => {
          if (!this.current(request)) return EMPTY;

          return this.execute(request).pipe(
            takeUntil(this.sessionChanged),

            catchError((error: unknown) => {
              if (!this.current(request)) return EMPTY;

              const message =
                error instanceof HttpErrorResponse &&
                typeof error.error?.message === 'string'
                  ? error.error.message
                  : 'Não foi possível atualizar seus favoritos. Tente novamente.';

              // Registra o erro conforme a operação.
              if (request.kind === 'sync') this.syncError.set(message);
              else if (request.kind === 'page') this.pageError.set(message);
              else
                this.errors.update((value) => ({
                  ...value,
                  [request.productId]: message,
                }));

              if (error instanceof HttpErrorResponse && error.status === 401)
                this.auth.handleUnauthorized(request.token);

              return EMPTY;
            }),

            finalize(() => {
              if (!this.current(request)) return;

              if (request.kind === 'sync') this.loading.set(false);
              else if (request.kind === 'page') {
                this.pageRequests--;

                this.pageLoading.set(this.pageRequests > 0);
              } else {
                this.pending.update((ids) => {
                  const next = new Set(ids);

                  next.delete(request.productId);

                  return next;
                });
              }
            }),
          );
        }),

        takeUntilDestroyed(),
      )
      .subscribe();

    // Limpa os dados ao alterar a sessão.
    this.auth.userChanged.pipe(takeUntilDestroyed()).subscribe(() => {
      this.session++;

      this.sessionChanged.next();

      this.confirmedIds.set(new Set());
      this.synchronized.set(false);
      this.loading.set(false);
      this.pending.set(new Set());
      this.errors.set({});
      this.syncError.set('');

      this.page.set(null);
      this.pageRequests = 0;
      this.pageLoading.set(false);
      this.pageError.set('');
      this.offset = 0;

      this.authenticated.set(!!this.auth.getToken());

      if (this.authenticated()) {
        this.synchronize();

        if (this.pageActive) this.loadPage(0);
      }
    });

    if (this.authenticated()) this.synchronize();
  }

  // Verifica se um produto está favoritado.
  isFavorite(id: number): boolean {
    return this.ids().has(id);
  }

  // Consulta uma página de produtos favoritos.
  getProductsPage(options: PageOptions = {}): Observable<Page<Product>> {
    return this.pagination
      .getPage<Product>(this.url, options)
      .pipe(takeUntil(this.sessionChanged));
  }

  // Sincroniza todos os favoritos do usuário.
  synchronize(): void {
    const token = this.auth.getToken();

    if (!token || this.loading()) return;

    this.loading.set(true);
    this.syncError.set('');

    this.requests.next({
      kind: 'sync',
      session: this.session,
      token,
    });
  }

  // Alterna o estado do favorito.
  toggle(id: number): void {
    if (!this.auth.getToken()) {
      void this.router.navigate(['/login']);
      return;
    }

    if (this.synchronized()) this.setFavorite(id, !this.isFavorite(id));
  }

  remove(id: number): void {
    this.setFavorite(id, false);
  }

  // Registra uma operação de alteração.
  private setFavorite(id: number, favorited: boolean): void {
    const token = this.auth.getToken();

    if (!token) {
      void this.router.navigate(['/login']);
      return;
    }

    if (
      !this.synchronized() ||
      this.pending().has(id) ||
      !Number.isSafeInteger(id) ||
      id <= 0
    )
      return;

    this.pending.update((ids) => new Set([...ids, id]));

    this.errors.update((value) => ({
      ...value,
      [id]: '',
    }));

    this.requests.next({
      kind: 'mutation',
      session: this.session,
      token,
      productId: id,
      favorited,
    });
  }

  // Informa que a página de favoritos está aberta.
  openPage(): void {
    this.pageActive = true;
    this.loadPage(0);
  }

  closePage(): void {
    this.pageActive = false;
  }

  // Carrega uma página de favoritos.
  loadPage(offset = this.offset): void {
    const token = this.auth.getToken();

    if (!token || !Number.isSafeInteger(offset) || offset < 0) return;

    if (!this.synchronized() && !this.loading()) this.synchronize();

    this.offset = offset;

    this.pageRequests++;

    this.pageLoading.set(true);
    this.pageError.set('');

    this.requests.next({
      kind: 'page',
      session: this.session,
      token,
      offset,
    });
  }

  // Confirma que a operação pertence à sessão atual.
  private current(request: FavoriteRequest): boolean {
    return (
      request.session === this.session && request.token === this.auth.getToken()
    );
  }

  // Executa a operação correspondente.
  private execute(request: FavoriteRequest): Observable<unknown> {
    if (request.kind === 'sync') {
      // Atualiza os IDs somente após carregar todas as páginas.
      return this.pagination.getAll<Product>(this.url).pipe(
        tap((products) => {
          if (!this.current(request)) return;

          this.confirmedIds.set(
            new Set(products.map((product) => product.id!)),
          );

          this.synchronized.set(true);
        }),
      );
    }

    if (request.kind === 'page') {
      return this.pagination
        .getPage<Product>(this.url, {
          offset: request.offset,
          limit: 20,
        })
        .pipe(
          tap((page) => {
            if (!this.current(request)) return;

            this.page.set(page);

            // Calcula a posição da última página válida.
            const lastOffset = Math.max(
              0,
              Math.floor((page.pagination.total - 1) / page.pagination.limit) *
                page.pagination.limit,
            );

            if (request.offset > lastOffset && this.pageActive)
              this.loadPage(lastOffset);
          }),
        );
    }

    // Adiciona ou remove um produto favorito.
    return this.http
      .request<{
        data: {
          productId: number;
          favorited: boolean;
        };
      }>(
        request.favorited ? 'PUT' : 'DELETE',
        `${this.url}/${request.productId}`,
      )
      .pipe(
        tap((response) => {
          if (!this.current(request)) return;

          // Confirma que o backend retornou a operação solicitada.
          if (
            response.data?.productId !== request.productId ||
            response.data.favorited !== request.favorited
          ) {
            throw new Error('Resposta inválida ao atualizar favorito');
          }

          // Atualiza o conjunto de IDs confirmados.
          this.confirmedIds.update((ids) => {
            const next = new Set(ids);

            if (response.data.favorited) next.add(request.productId);
            else next.delete(request.productId);

            return next;
          });

          if (this.pageActive) this.loadPage(this.offset);
        }),
      );
  }
}
