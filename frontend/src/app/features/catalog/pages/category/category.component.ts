import { NotFoundComponent } from '../../../not-found/not-found.component';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';
import { CatalogService } from '../../services/catalog.service';
import { CatalogState } from '../../interfaces/catalog-state';
import { Category } from '../../interfaces/category.interface';
import { CatalogProduct } from '../../interfaces/product.interface';
import { CatalogLayoutComponent } from '../../components/catalog-layout/catalog-layout.component';
import { BreadcrumbsComponent, BreadcrumbItem } from '../../components/breadcrumbs/breadcrumbs.component';
import { ProductGridComponent } from '../../components/product-grid/product-grid.component';

interface CategoryData { category: Category | null; products: CatalogProduct[]; total: number; hasMore: boolean; }

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [NotFoundComponent, CatalogLayoutComponent, BreadcrumbsComponent, ProductGridComponent],
  templateUrl: './category.component.html',
  styleUrl: './category.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CatalogService);

  private readonly pageSize = 12;
  private readonly query = new BehaviorSubject({ search: '', maxPrice: '', available: false, sort: '', offset: 0 });
  readonly criteria = toSignal(this.query, { requireSync: true });

  applyFilters(search: string, maxPrice: string, available: boolean, sort: string): void {
    this.query.next({ search: search.trim(), maxPrice, available, sort, offset: 0 });
  }

  movePage(delta: number): void {
    const current = this.query.value;
    this.query.next({ ...current, offset: Math.max(0, current.offset + delta * this.pageSize) });
  }

  readonly state = toSignal(combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
    switchMap(([params, query]) => {
      const slug = params.get('slug') ?? '';
      this.query.next({ search: (query.get('q') ?? '').trim().slice(0, 120), maxPrice: '', available: false, sort: '', offset: 0 });
      return this.catalog.getCategoryBySlug(slug).pipe(
      switchMap(category => this.query.pipe(
        switchMap(({ search, maxPrice, available, sort, offset }) => {
          if (!category) return of<CatalogState<CategoryData>>({ status: 'loaded', data: { category, products: [], total: 0, hasMore: false } });
          const filters: Record<string, string | number> = {};
          if (search) filters['name__contains'] = search;
          if (maxPrice) filters['price__lte'] = maxPrice;
          if (available) filters['stock__gte'] = 1;
          if (sort) filters['sort'] = sort;
          return this.catalog.getCategoryPage(category, { offset, limit: this.pageSize, filters }).pipe(
            map(({ items, pagination }): CatalogState<CategoryData> => ({
              status: 'loaded', data: { category, products: items, total: pagination.total, hasMore: pagination.hasMore },
            })),
            startWith<CatalogState<CategoryData>>({ status: 'loading' }),
            catchError(() => of<CatalogState<CategoryData>>({ status: 'error' })),
          );
        }),
      )),
      catchError(() => of<CatalogState<CategoryData>>({ status: 'error' })),
      startWith<CatalogState<CategoryData>>({ status: 'loading' }),
      );
    }),
  ), { initialValue: { status: 'loading' } as CatalogState<CategoryData> });

  readonly page = computed(() => { const state = this.state(); return state.status === 'loaded' ? state.data : null; });
  readonly pageNumber = computed(() => this.criteria().offset / this.pageSize + 1);

  readonly category = computed(() => { const state = this.state(); return state.status === 'loaded' ? state.data.category : null; });
  readonly products = computed(() => { const state = this.state(); return state.status === 'loaded' ? state.data.products : []; });
  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => [
    { label: 'Home', url: '/home' },
    { label: this.category()?.name ?? 'CatÃ¡logo' },
  ]);
}
