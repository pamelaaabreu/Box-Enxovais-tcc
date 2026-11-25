import { AssetUrlService } from '../../../../shared/services/asset-url.service';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { AdminFiltersComponent } from '../../../../shared/components/admin-filters/admin-filters.component';
import type { AdminFilterField } from '../../../../shared/types/ui/admin-filters';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { CustomAlertService } from '../../../../core/services/custom-alert.service';
import { AdminStateComponent } from '../../../../shared/components/admin-state/admin-state.component';
import { AdminPageHeaderComponent } from '../../../../shared/components/admin-page-header/admin-page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CurrencyPipe, DecimalPipe, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import {
  ChangeDetectionStrategy,
  DestroyRef,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  EMPTY,
  catchError,
  defer,
  finalize,
  switchMap,
  tap,
} from 'rxjs';
import { ProductService } from '../../../../core/services/product.service';
import type {
  Page,
  PageOptions,
} from '../../../../shared/types/api/pagination';
import type { Product } from '../../../../shared/types/products/product';
import { ProductMediaComponent } from '../../../catalog/components/product-media/product-media.component';

registerLocaleData(localePt);

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [
    StatusBadgeComponent,
    MatMenuModule,
    MatIconModule,
    MatSelectModule,
    AdminFiltersComponent,
    AdminStateComponent,
    AdminPageHeaderComponent,
    PaginationComponent,
    CurrencyPipe,
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    ProductMediaComponent,
  ],
  templateUrl: './product.component.html',
  styleUrl: './product.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductComponent {
  private readonly assetUrls = inject(AssetUrlService);
  private readonly products = inject(ProductService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly alerts = inject(CustomAlertService);
  private readonly destroyRef = inject(DestroyRef);
  removing = false;
  remove(product: Product): void {
    if (!product.id || this.removing) return;
    let action: 'deleted' | 'archived' = 'deleted';
    this.confirm
      .open({
        title: 'Excluir produto?',
        message: product.name,
        details: [
          'Produtos com pedidos, carrinhos, promoções, favoritos ou outros vínculos serão arquivados para preservar os registros.',
          'Produtos sem vínculos serão excluídos. As imagens físicas serão preservadas.',
        ],
        variant: 'danger',
        primary: 'Excluir ou arquivar',
        secondary: 'Cancelar',
        disableClose: true,
        execute: () => {
          this.removing = true;
          return this.products.removeProduct(product.id!).pipe(
            tap((result) => (action = result.action)),
            finalize(() => (this.removing = false)),
          );
        },
        errorMessage: (error) => {
          const value = error as { error?: { message?: string } };
          return (
            value.error?.message ||
            'Não foi possível excluir o produto. Tente novamente.'
          );
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.alerts.success(
          action === 'archived'
            ? 'Produto arquivado. Os vínculos foram preservados.'
            : 'Produto excluído com sucesso.',
        );
        const offset =
          this.page()?.items.length === 1
            ? Math.max(
                0,
                (this.options.offset || 0) - (this.options.limit || 20),
              )
            : this.options.offset;
        this.load({ ...this.options, offset });
      });
  }
  readonly filters = inject(FormBuilder).nonNullable.group({
    name: '',
    status: '',
    stock: '',
    limit: 20,
  });
  readonly filterFields: AdminFilterField[] = [
    {
      key: 'product-search',
      id: 'product-search',
      type: 'search',
      label: 'Buscar produto',
      control: this.filters.controls.name,
      placeholder: 'Nome ou SKU do produto',
      maxlength: 200,
      wide: true,
    },
    {
      key: 'product-status',
      type: 'select',
      label: 'Status',
      control: this.filters.controls.status,
      options: [
        { value: '', label: 'Todos os status' },
        { value: 'active', label: 'Ativos' },
        { value: 'inactive', label: 'Inativos' },
        { value: 'archived', label: 'Arquivados' },
      ],
    },
    {
      key: 'product-stock',
      type: 'select',
      label: 'Estoque',
      control: this.filters.controls.stock,
      options: [
        { value: '', label: 'Todos' },
        { value: 'available', label: 'Em estoque' },
        { value: 'empty', label: 'Sem estoque' },
      ],
    },
  ];
  readonly page = signal<Page<Product> | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly createdId = signal(0);
  readonly total = computed(() => this.page()?.pagination.total ?? 0);
  readonly currentPage = computed(() => {
    const meta = this.page()?.pagination;
    return meta ? Math.floor(meta.offset / meta.limit) + 1 : 1;
  });
  readonly totalPages = computed(() =>
    Math.max(
      1,
      Math.ceil(this.total() / (this.page()?.pagination.limit ?? 20)),
    ),
  );
  private options: PageOptions = { offset: 0, limit: 20 };
  private readonly requests = new BehaviorSubject<PageOptions>(this.options);

  constructor() {
    const route = inject(ActivatedRoute);
    const search =
      route.snapshot.queryParamMap.get('q')?.trim().slice(0, 120) ?? '';
    if (search) {
      this.filters.controls.name.setValue(search);
      this.applyFilters();
    }
    this.requests
      .pipe(
        switchMap((options) =>
          defer(() => {
            this.loading.set(true);
            this.error.set('');
            return this.products.getAdminProductsPage(options).pipe(
              tap((page) => this.page.set(page)),
              catchError((error) => {
                this.page.set(null);
                this.error.set(
                  typeof error.error?.message === 'string'
                    ? error.error.message
                    : error.status === 0
                      ? 'Não foi possível conectar ao servidor.'
                      : 'Não foi possível carregar os produtos. Tente novamente.',
                );
                return EMPTY;
              }),
              finalize(() => this.loading.set(false)),
            );
          }),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();
    route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.createdId.set(Number(params.get('created')) || 0);
      const term = params.get('q')?.trim().slice(0, 120) ?? '';
      if (this.filters.controls.name.value !== term) {
        this.filters.controls.name.setValue(term);
        this.applyFilters();
      }
    });
  }

  applyFilters(): void {
    const value = this.filters.getRawValue();
    const filters: Record<string, string | number> = {};
    if (value.name.trim()) filters['search__contains'] = value.name.trim();
    if (value.status) filters['status'] = value.status;
    if (value.stock === 'available') filters['stock__gte'] = 1;
    if (value.stock === 'empty') filters['stock'] = 0;
    this.load({ offset: 0, limit: Number(value.limit), filters });
  }

  clearFilters(): void {
    this.filters.reset({ name: '', status: '', stock: '', limit: 20 });
    this.applyFilters();
  }

  changePage(direction: number): void {
    const meta = this.page()?.pagination;
    if (
      !meta ||
      this.loading() ||
      (direction === -1 && meta.offset === 0) ||
      (direction === 1 && !meta.hasMore)
    )
      return;
    this.load({
      ...this.options,
      offset: Math.max(0, meta.offset + direction * meta.limit),
    });
  }

  retry(): void {
    this.load(this.options);
  }

  private load(options: PageOptions): void {
    this.options = options;
    this.requests.next(options);
  }

  statusLabel(status: string): string {
    return (
      (
        {
          active: 'Ativo',
          inactive: 'Inativo',
          archived: 'Arquivado',
        } as Record<string, string>
      )[status] ?? status
    );
  }

  image(product: Product) {
    const path = product.image_paths?.[0];
    if (!path) return null;
    return {
      id: 0,
      url: /^https?:\/\//.test(path) ? path : this.assetUrls.resolve(path),
      alt: product.name,
      position: 0,
    };
  }
}
