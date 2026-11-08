import { CurrencyPipe, DecimalPipe, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, EMPTY, catchError, defer, finalize, switchMap, tap } from 'rxjs';
import { ProductService } from '../../../core/services/product.service';
import { Page, PageOptions } from '../../../core/services/pagination.service';
import { Product } from '../../../shared/models';
import { ProductMediaComponent } from '../../../features/catalog/components/product-media/product-media.component';

registerLocaleData(localePt);

@Component({
  selector: 'app-product', standalone: true,
  imports: [CurrencyPipe, DecimalPipe, ReactiveFormsModule, RouterLink, ProductMediaComponent],
  templateUrl: './product.component.html', styleUrl: './product.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductComponent {
  private readonly products = inject(ProductService);
  readonly filters = inject(FormBuilder).nonNullable.group({ name: '', status: '', stock: '', limit: 20 });
  readonly page = signal<Page<Product> | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly total = computed(() => this.page()?.pagination.total ?? 0);
  readonly currentPage = computed(() => {
    const meta = this.page()?.pagination;
    return meta ? Math.floor(meta.offset / meta.limit) + 1 : 1;
  });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / (this.page()?.pagination.limit ?? 20))));
  private options: PageOptions = { offset: 0, limit: 20 };
  private readonly requests = new BehaviorSubject<PageOptions>(this.options);

  constructor() {
    this.requests.pipe(
      switchMap(options => defer(() => {
        this.loading.set(true); this.error.set('');
        return this.products.getAdminProductsPage(options).pipe(
          tap(page => this.page.set(page)),
          catchError(error => {
            this.page.set(null);
            this.error.set(typeof error.error?.message === 'string' ? error.error.message
              : error.status === 0 ? 'Não foi possível conectar ao servidor.' : 'Não foi possível carregar os produtos. Tente novamente.');
            return EMPTY;
          }),
          finalize(() => this.loading.set(false)),
        );
      })),
      takeUntilDestroyed(),
    ).subscribe();
  }

  applyFilters(): void {
    const value = this.filters.getRawValue();
    const filters: Record<string, string | number> = {};
    if (value.name.trim()) filters['name__contains'] = value.name.trim();
    if (value.status) filters['status'] = value.status;
    if (value.stock === 'available') filters['stock__gte'] = 1;
    if (value.stock === 'empty') filters['stock'] = 0;
    this.load({ offset: 0, limit: Number(value.limit), filters });
  }

  clearFilters(): void {
    this.filters.reset({ name: '', status: '', stock: '', limit: 20 });
    this.applyFilters();
  }

  changePage(direction: -1 | 1): void {
    const meta = this.page()?.pagination;
    if (!meta || this.loading() || direction === -1 && meta.offset === 0 || direction === 1 && !meta.hasMore) return;
    this.load({ ...this.options, offset: Math.max(0, meta.offset + direction * meta.limit) });
  }

  retry(): void { this.load(this.options); }

  private load(options: PageOptions): void { this.options = options; this.requests.next(options); }

  statusLabel(status: string): string {
    return ({ active: 'Ativo', inactive: 'Inativo', archived: 'Arquivado' } as Record<string, string>)[status] ?? status;
  }

  image(product: Product) {
    const path = product.image_paths?.[0];
    if (!path) return null;
    return { id: 0, url: /^https?:\/\//.test(path) ? path : `http://localhost:8080/${path.replace(/^\/+/, '')}`, alt: product.name, position: 0 };
  }
}
