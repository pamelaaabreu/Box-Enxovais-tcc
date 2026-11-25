import { CustomAlertService } from './custom-alert.service';
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

// Informações da compra imediata.
export type QuickPurchase = {
  productId: number;
  quantity: number;
  variantId?: number;
  reuseCartItem: boolean;
};

// Estrutura de uma operação enfileirada.
type CartRequest = {
  onAdded?: () => void;
  onAddError?: (message: string, status: number) => void;
  method: string;
  path: string;
  body?: unknown;
  key: number;
  productId?: number;
  session: number;
};

// Cria um carrinho vazio.
const emptyCart = (): Cart => ({
  items: [],
  totalItems: 0,
  total: 0,
});

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly alerts = inject(CustomAlertService);
  private readonly router = inject(Router);

  // Fila de operações HTTP.
  private readonly queue = new Subject<CartRequest>();

  private session = 0;
  private quickPurchase?: QuickPurchase;

  // Estado interno do carrinho.
  private readonly state = signal<Cart>(emptyCart());

  // Expõe o estado sem permitir alteração direta.
  readonly cart = this.state.asReadonly();

  // Valores derivados do estado do carrinho.
  readonly totalItems = computed(() => this.cart().totalItems);
  readonly total = computed(() => this.cart().total);

  readonly pending = signal<ReadonlySet<number>>(new Set());
  readonly busy = computed(() => this.pending().size > 0);

  readonly reordering = computed(() =>
    this.pending().has(Number.MIN_SAFE_INTEGER),
  );

  readonly loading = signal(false);
  readonly error = signal('');
  readonly feedback = signal<Record<number, string>>({});

  constructor() {
    // Processa as requisições sequencialmente.
    this.queue
      .pipe(
        concatMap((request) =>
          defer(() => {
            // Descarta operações de sessões anteriores.
            if (request.session !== this.session) return EMPTY;

            return this.http
              .request<{
                data: Cart;
              }>(request.method, `http://localhost:8080/cart${request.path}`, {
                body: request.body,
              })
              .pipe(
                // Cancela a inscrição quando a sessão muda.
                takeUntil(this.auth.userChanged),

                tap((response) => {
                  if (request.session !== this.session) return;

                  const remainingProducts = new Set(
                    response.data.items.map((item) => item.productId),
                  );

                  // Identifica produtos removidos do carrinho.
                  const removedProducts = this.cart()
                    .items.filter(
                      (item) => !remainingProducts.has(item.productId),
                    )
                    .map((item) => item.productId);

                  // Remove mensagens associadas aos produtos removidos.
                  this.feedback.update((value) => {
                    if (request.method === 'DELETE' && request.path === '')
                      return {};

                    const next = { ...value };

                    for (const productId of removedProducts)
                      delete next[productId];

                    return next;
                  });

                  // Atualiza o estado com a resposta do backend.
                  this.state.set(response.data);

                  if (
                    request.method === 'POST' &&
                    request.path === '/items' &&
                    !request.onAdded
                  ) {
                    const name = response.data.items.find(
                      (item) => item.productId === request.productId,
                    )?.name;

                    this.alerts.success('Adicionado à sacola', name, {
                      action: {
                        label: 'Ver sacola',
                        run: () => {
                          void this.router.navigate(['/cart']);
                        },
                      },
                    });
                  }

                  // Executa o callback quando disponibilizado.
                  request.onAdded?.();

                  // Redireciona após uma recompra.
                  if (request.key === Number.MIN_SAFE_INTEGER)
                    void this.router.navigate(['/cart']);

                  if (request.productId && request.method !== 'DELETE')
                    this.feedback.update((value) => ({
                      ...value,
                      [request.productId!]:
                        request.method === 'POST'
                          ? 'Adicionado ao carrinho.'
                          : '',
                    }));
                }),

                // Trata falhas sem encerrar a fila.
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

                  request.onAddError?.(message, error.status);

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

                // Remove a operação dos registros pendentes.
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

        // Encerra a inscrição quando o service for destruído.
        takeUntilDestroyed(),
      )
      .subscribe();

    // Reinicia o estado quando o usuário muda.
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

  // Consulta o carrinho.
  load(): void {
    if (this.auth.getToken()) this.request('GET', '', -1);
  }

  // Adiciona novamente os produtos de um pedido.
  reorder(orderId: number): void {
    this.request('POST', '/orders/' + orderId, Number.MIN_SAFE_INTEGER);
  }

  // Prepara a compra imediata.
  async buyNow(
    productId: number,
    quantity: number,
    variantId?: number,
    reuseCartItem = false,
  ): Promise<void> {
    const purchase = {
      productId,
      quantity,
      variantId,
      reuseCartItem,
    };

    this.quickPurchase = purchase;

    try {
      if (
        await this.router.navigate(['/checkout'], {
          queryParams: { compra: 'agora' },
        })
      )
        return;
    } catch {
      this.alerts.error(
        'Não foi possível abrir o checkout',
        'Tente novamente.',
      );
    }

    if (this.quickPurchase === purchase) this.quickPurchase = undefined;
  }

  // Consome a informação da compra imediata.
  consumeQuickPurchase(onReady: (purchase: QuickPurchase) => void): void {
    const purchase = this.quickPurchase;

    this.quickPurchase = undefined;

    if (!purchase) return;

    // Reutiliza o item quando ele já está no carrinho.
    if (purchase.reuseCartItem) {
      onReady(purchase);
    } else {
      this.add(purchase.productId, purchase.quantity, purchase.variantId, () =>
        onReady(purchase),
      );
    }
  }

  // Adiciona um produto.
  add(
    productId: number,
    quantity = 1,
    variantId?: number,
    onAdded?: () => void,
    onAddError?: (message: string, status: number) => void,
  ): void {
    this.request(
      'POST',
      '/items',
      productId,
      {
        productId,
        quantity,
        ...(variantId ? { variantId } : {}),
      },
      productId,
      onAdded,
      onAddError,
    );
  }

  // Atualiza a quantidade de um item.
  update(id: number, quantity: number): void {
    this.request(
      'PATCH',
      `/items/${id}`,
      -id - 1,
      { quantity },
      this.cart().items.find((item) => item.id === id)?.productId,
    );
  }

  // Remove um item.
  remove(id: number): void {
    this.request(
      'DELETE',
      `/items/${id}`,
      -id - 1,
      undefined,
      this.cart().items.find((item) => item.id === id)?.productId,
    );
  }

  // Limpa o carrinho.
  clear(): void {
    this.request('DELETE', '', 0);
  }

  // Registra uma operação na fila.
  private request(
    method: string,
    path: string,
    key: number,
    body?: unknown,
    productId?: number,
    onAdded?: () => void,
    onAddError?: (message: string, status: number) => void,
  ): void {
    if (!this.auth.getToken()) {
      void this.router.navigate(['/login']);
      return;
    }

    // Impede operações simultâneas com a mesma chave.
    if (this.pending().has(key)) return;

    this.error.set('');

    if (productId && method === 'POST')
      this.feedback.update((value) => ({
        ...value,
        [productId]: '',
      }));

    this.pending.update((keys) => new Set([...keys, key]));

    if (method === 'GET') this.loading.set(true);

    // Emite a operação para processamento.
    this.queue.next({
      method,
      path,
      key,
      body,
      productId,
      session: this.session,
      onAdded,
      onAddError,
    });
  }
}
