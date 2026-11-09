import {
  CurrencyPipe,
  DatePipe,
  NgTemplateOutlet,
  registerLocaleData,
} from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, Injector, TemplateRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  BehaviorSubject,
  Subject,
  distinctUntilChanged,
  timer,
  of,
  filter,
  finalize,
  EMPTY,
  combineLatest,
  map,
  catchError,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { CatalogLayoutComponent } from '../catalog/components/catalog-layout/catalog-layout.component';

registerLocaleData(localePt);

interface Order {
  id: number;
  createdAt: string;
  total: number;
  status: string;
  items: {
    id: number;
    name: string;
    quantity: number;
    image: string;
    productId?: number;
    unitPrice: number;
    subtotal: number;
  }[];
}

interface Details extends Order {
  canCancel: boolean;
  address: {
    recipient: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  paymentMethod: string;
}

interface OrderPage {
  orders: Order[];
  hasMore: boolean;
}

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [
    CatalogLayoutComponent,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    NgTemplateOutlet,
    MatFormFieldModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './order-history.component.html',
  styleUrl: './order-history.component.scss',
})
export class OrderHistoryComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private cancellationDialog?: MatDialogRef<unknown, boolean>;
  readonly cancelling = signal(false);
  readonly cancelError = signal('');
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly reload = new BehaviorSubject<void>(undefined);
  readonly page = signal(1);
  readonly search = signal('');
  readonly searchDraft = signal('');
  private readonly searchInput = new Subject<{value: string; immediate: boolean}>();
  private readonly injector = inject(Injector);
  readonly reorderCart = signal<CartService | null>(null);
  readonly loadingMore = signal(false);
  readonly loadMoreError = signal(false);
  readonly sort = signal('recent');
  readonly period = signal('all');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly invalidDates = computed(
    () =>
      !!this.dateFrom() && !!this.dateTo() && this.dateFrom() > this.dateTo(),
  );
  readonly filtersActive = computed(
    () => this.period() !== 'all' || !!this.search(),
  );
  readonly hasMore = signal(false);
  readonly details = signal<Details | null>(null);
  readonly payments: Record<string, string> = {
    pix: 'Pix',
    card: 'Cartão de crédito',
    boleto: 'Boleto bancário',
  };
  readonly orders = signal<Order[]>([]);
  readonly state = signal<
    'loading' | 'ready' | 'error' | 'expired' | 'missing' | 'waiting-dates'
  >('loading');
  readonly brokenImages = signal<ReadonlySet<number>>(new Set());

  constructor() {
    const auth = this.auth;
    this.searchInput.pipe(
      switchMap(({value, immediate}) => immediate ? of(value) : timer(300).pipe(map(() => value))),
      distinctUntilChanged(),
      takeUntil(auth.userChanged),
      takeUntilDestroyed(),
    ).subscribe(value => {
      if (value === this.search()) return;
      this.search.set(value);
      this.reloadFilters();
    });
    this.destroyRef.onDestroy(() => this.cancellationDialog?.close());
    auth.userChanged.pipe(takeUntilDestroyed()).subscribe(() => this.expire());
    combineLatest([inject(ActivatedRoute).paramMap, this.reload])
      .pipe(
        tap(([params]) => {
          if (!params.get('id') && this.loadingMore()) return;
          this.loadingMore.set(false);
          this.loadMoreError.set(false);
          this.state.set('loading');
          this.details.set(null);
          this.cancelError.set('');
          this.orders.set([]);
        }),
        switchMap(([params]) => {
          const id = params.get('id');
          if (
            !id &&
            this.period() === 'custom' &&
            (!this.dateFrom() || !this.dateTo() || this.invalidDates())
          ) {
            this.state.set('waiting-dates');
            return EMPTY;
          }
          const url = id
            ? 'http://localhost:8080/orders/' + encodeURIComponent(id)
            : this.listUrl();
          return this.http.get<{ data: OrderPage | Details }>(url).pipe(
            map((response) => ({ id, data: response?.data })),
            catchError((error: HttpErrorResponse) => {
              if (error.status === 401) this.expire();
              else if (!id && this.loadingMore()) {
                this.page.update(page => page - 1);
                this.loadingMore.set(false);
                this.loadMoreError.set(true);
              } else
                this.state.set(
                  id && error.status === 404 ? 'missing' : 'error',
                );
              return EMPTY;
            }),
          );
        }),
        takeUntil(auth.userChanged),
        takeUntilDestroyed(),
      )
      .subscribe(({ id, data }) => {
        if (
          id &&
          data &&
          'address' in data &&
          String(data.id) === id &&
          Array.isArray(data.items)
        ) {
          this.details.set(data);
        } else if (
          !id &&
          data &&
          'orders' in data &&
          Array.isArray(data.orders)
        ) {
          this.orders.update(current => {
            if (!this.loadingMore()) return data.orders;
            const known = new Set(current.map(order => order.id));
            return [...current, ...data.orders.filter(order => !known.has(order.id))];
          });
          this.loadingMore.set(false);
          this.hasMore.set(data.hasMore);
        } else {
          this.state.set('error');
          return;
        }
        this.state.set('ready');
      });
  }

  updateFilters(
    field: 'sort' | 'period' | 'dateFrom' | 'dateTo',
    value: string,
  ): void {
    if (this[field]() === value) return;
    this[field].set(value);
    if (field === 'period' && value !== 'custom') {
      this.dateFrom.set('');
      this.dateTo.set('');
    }
    this.reloadFilters();
  }

  clearFilters(): void {
    this.search.set('');
    this.submitSearch('');
    this.sort.set('recent');
    this.period.set('all');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.reloadFilters();
  }

  changeSearch(value: string): void {
    this.searchDraft.set(value);
    this.searchInput.next({value: value.trim(), immediate: false});
  }

  submitSearch(value: string): void {
    this.searchDraft.set(value);
    this.searchInput.next({value: value.trim(), immediate: true});
  }

  reorder(orderId: number): void {
    const cart = this.injector.get(CartService);
    this.reorderCart.set(cart);
    cart.reorder(orderId);
  }

  private reloadFilters(): void {
    this.loadingMore.set(false);
    this.loadMoreError.set(false);
    this.page.set(1);
    this.reload.next();
  }

  private listUrl(): string {
    const query = new URLSearchParams({ page: String(this.page()) });
    if (this.sort() !== 'recent') query.set('sort', this.sort());
    if (this.search()) query.set('search', this.search());
    if (this.period() === 'cancelled') query.set('status', 'cancelled');
    let from = this.dateFrom();
    let to = this.dateTo();
    if (['7', '30', '6m'].includes(this.period())) {
      const today = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Sao_Paulo',
      }).format(new Date());
      const start = new Date(today + 'T00:00:00Z');
      if (this.period() === '6m') {
        const day = start.getUTCDate();
        start.setUTCDate(1);
        start.setUTCMonth(start.getUTCMonth() - 6);
        const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
        start.setUTCDate(Math.min(day, lastDay));
      } else {
        start.setUTCDate(start.getUTCDate() - Number(this.period()) + 1);
      }
      from = start.toISOString().slice(0, 10);
      to = today;
    }
    if (from) query.set('dateFrom', from);
    if (to) query.set('dateTo', to);
    return 'http://localhost:8080/orders?' + query;
  }

  retry(): void {
    if (!this.invalidDates() && this.state() === 'error') this.reload.next();
  }

  movePage(delta: -1 | 1): void {
    if (
      this.loadingMore() ||
      this.invalidDates() ||
      this.state() !== 'ready' ||
      (delta === -1 ? this.page() === 1 : !this.hasMore())
    )
      return;
    this.loadMoreError.set(false);
    this.loadingMore.set(delta === 1);
    this.page.update((page) => page + delta);
    this.reload.next();
  }

  confirmCancellation(template: TemplateRef<unknown>, order: Details): void {
    if (!order.canCancel || order.status === 'cancelled' || this.cancelling() || this.cancellationDialog) return;
    this.cancelError.set('');
    const dialog = this.dialog.open<unknown, unknown, boolean>(template, {
      ariaLabel: 'Cancelar pedido #' + order.id + '?',
      width: '420px',
      maxWidth: 'calc(100% - 32px)',
      autoFocus: 'first-tabbable',
    });
    this.cancellationDialog = dialog;
    dialog.afterClosed().pipe(
      tap(() => { this.cancellationDialog = undefined; }),
      filter(confirmed => confirmed === true && this.details()?.id === order.id),
      switchMap(() => {
        this.cancelling.set(true);
        return this.http.post<{ data: Details }>('http://localhost:8080/orders/' + order.id + '/cancel', {}).pipe(
          finalize(() => this.cancelling.set(false)),
        );
      }),
      takeUntil(this.auth.userChanged),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: ({ data }) => {
        if (this.details()?.id !== order.id) return;
        this.details.set(data);
        this.snackBar.open('Pedido cancelado com sucesso.', 'Fechar', { duration: 5000 });
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 401) this.expire();
        else if (this.details()?.id === order.id) {
          this.cancelError.set(error.status === 409 && typeof error.error?.message === 'string'
            ? error.error.message : 'Não foi possível cancelar o pedido. Tente novamente.');
        }
      },
    });
  }

  units(order: Order): number {
    return order.items.reduce((total, item) => total + item.quantity, 0);
  }

  subtotal(order: Order): number {
    return (
      order.items.reduce(
        (total, item) => total + Math.round(item.subtotal * 100),
        0,
      ) / 100
    );
  }

  imageUrl(path: string): string {
    return /^https?:\/\//.test(path)
      ? path
      : 'http://localhost:8080/' + path.replace(/^\//, '');
  }

  markBroken(id: number): void {
    this.brokenImages.update((ids) => new Set([...ids, id]));
  }

  private expire(): void {
    if (this.state() === 'expired') return;
    this.cancellationDialog?.close();
    this.loadingMore.set(false);
    this.orders.set([]);
    this.details.set(null);
    this.state.set('expired');
    void this.router.navigate(['/login']);
  }
}
