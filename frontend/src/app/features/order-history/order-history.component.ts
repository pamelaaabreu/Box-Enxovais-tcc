import { CurrencyPipe, DatePipe, NgTemplateOutlet, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BehaviorSubject, EMPTY, combineLatest, map, catchError, switchMap, takeUntil, tap } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CatalogLayoutComponent } from '../catalog/components/catalog-layout/catalog-layout.component';

registerLocaleData(localePt);

interface Order {
  id: number;
  createdAt: string;
  total: number;
  status: string;
  items: { id: number; name: string; quantity: number; image: string; unitPrice: number; subtotal: number }[];
}

interface Details extends Order {
  address: { recipient: string; street: string; number: string; complement: string; neighborhood: string; city: string; state: string; zipCode: string };
  paymentMethod: string;
}

interface OrderPage { orders: Order[]; hasMore: boolean }

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CatalogLayoutComponent, RouterLink, CurrencyPipe, DatePipe, NgTemplateOutlet, MatFormFieldModule, MatSelectModule],
  templateUrl: './order-history.component.html',
  styleUrl: './order-history.component.scss',
})
export class OrderHistoryComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly reload = new BehaviorSubject<void>(undefined);
  readonly page = signal(1);
  readonly sort = signal('recent');
  readonly period = signal('all');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly invalidDates = computed(() => !!this.dateFrom() && !!this.dateTo() && this.dateFrom() > this.dateTo());
  readonly filtersActive = computed(() => this.sort() !== 'recent' || this.period() !== 'all');
  readonly hasMore = signal(false);
  readonly details = signal<Details | null>(null);
  readonly payments: Record<string, string> = { pix: 'Pix', card: 'Cartão de crédito', boleto: 'Boleto bancário' };
  readonly orders = signal<Order[]>([]);
  readonly state = signal<'loading' | 'ready' | 'error' | 'expired' | 'missing' | 'waiting-dates'>('loading');
  readonly brokenImages = signal<ReadonlySet<number>>(new Set());

  constructor() {
    const auth = inject(AuthService);
    auth.userChanged.pipe(takeUntilDestroyed()).subscribe(() => this.expire());
    combineLatest([inject(ActivatedRoute).paramMap, this.reload]).pipe(
      tap(() => {
        this.state.set('loading');
        this.details.set(null);
        this.orders.set([]);
      }),
      switchMap(([params]) => {
        const id = params.get('id');
        if (!id && this.period() === 'custom' && (!this.dateFrom() || !this.dateTo() || this.invalidDates())) {
          this.state.set('waiting-dates');
          return EMPTY;
        }
        const url = id ? 'http://localhost:8080/orders/' + encodeURIComponent(id)
          : this.listUrl();
        return this.http.get<{ data: OrderPage | Details }>(url).pipe(
        map(response => ({ id, data: response?.data })),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) this.expire();
          else this.state.set(id && error.status === 404 ? 'missing' : 'error');
          return EMPTY;
        }),
        );
      }),
      takeUntil(auth.userChanged),
      takeUntilDestroyed(),
    ).subscribe(({ id, data }) => {
      if (id && data && 'address' in data && String(data.id) === id && Array.isArray(data.items)) {
        this.details.set(data);
      } else if (!id && data && 'orders' in data && Array.isArray(data.orders)) {
        this.orders.set(data.orders);
        this.hasMore.set(data.hasMore);
      } else {
        this.state.set('error');
        return;
      }
      this.state.set('ready');
    });
  }

  updateFilters(field: 'sort' | 'period' | 'dateFrom' | 'dateTo', value: string): void {
    if (this[field]() === value) return;
    this[field].set(value);
    if (field === 'period' && value !== 'custom') {
      this.dateFrom.set('');
      this.dateTo.set('');
    }
    this.reloadFilters();
  }

  clearFilters(): void {
    this.sort.set('recent');
    this.period.set('all');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.reloadFilters();
  }

  private reloadFilters(): void {
    this.page.set(1);
    this.reload.next();
  }

  private listUrl(): string {
    const query = new URLSearchParams({ page: String(this.page()) });
    if (this.sort() !== 'recent') query.set('sort', this.sort());
    let from = this.dateFrom();
    let to = this.dateTo();
    if (this.period() === '7' || this.period() === '30') {
      const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
      const start = new Date(today + 'T00:00:00Z');
      start.setUTCDate(start.getUTCDate() - Number(this.period()) + 1);
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
    if (this.invalidDates() || this.state() !== 'ready' || (delta === -1 ? this.page() === 1 : !this.hasMore())) return;
    this.page.update(page => page + delta);
    this.reload.next();
  }

  units(order: Order): number {
    return order.items.reduce((total, item) => total + item.quantity, 0);
  }

  subtotal(order: Order): number {
    return order.items.reduce((total, item) => total + Math.round(item.subtotal * 100), 0) / 100;
  }

  imageUrl(path: string): string {
    return /^https?:\/\//.test(path) ? path : 'http://localhost:8080/' + path.replace(/^\//, '');
  }

  markBroken(id: number): void {
    this.brokenImages.update(ids => new Set([...ids, id]));
  }

  private expire(): void {
    if (this.state() === 'expired') return;
    this.orders.set([]);
    this.details.set(null);
    this.state.set('expired');
    void this.router.navigate(['/login']);
  }
}
