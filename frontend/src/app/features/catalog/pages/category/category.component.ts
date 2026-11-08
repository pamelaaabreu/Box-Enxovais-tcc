import { NotFoundComponent } from '../../../not-found/not-found.component';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { CatalogService } from '../../services/catalog.service';
import { CatalogState } from '../../interfaces/catalog-state';
import { Category } from '../../interfaces/category.interface';
import { CatalogProduct } from '../../interfaces/product.interface';
import { CatalogLayoutComponent } from '../../components/catalog-layout/catalog-layout.component';
import { BreadcrumbsComponent, BreadcrumbItem } from '../../components/breadcrumbs/breadcrumbs.component';
import { ProductGridComponent } from '../../components/product-grid/product-grid.component';
import { ProductFiltersComponent } from '../../components/product-filters/product-filters.component';
import { ProductSortComponent } from '../../components/product-sort/product-sort.component';

interface CategoryData { category: Category | null; products: CatalogProduct[]; }

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [NotFoundComponent, RouterLink, CatalogLayoutComponent, BreadcrumbsComponent, ProductGridComponent, ProductFiltersComponent, ProductSortComponent],
  templateUrl: './category.component.html',
  styleUrl: './category.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CatalogService);

  readonly state = toSignal(this.route.paramMap.pipe(
    switchMap(params => {
      const slug = params.get('slug') ?? '';
      return forkJoin({ category: this.catalog.getCategoryBySlug(slug), products: this.catalog.getProductsByCategory(slug) }).pipe(
        map((data): CatalogState<CategoryData> => ({ status: 'loaded', data })),
        startWith<CatalogState<CategoryData>>({ status: 'loading' }),
        catchError(() => of<CatalogState<CategoryData>>({ status: 'error' })),
      );
    }),
  ), { initialValue: { status: 'loading' } as CatalogState<CategoryData> });

  readonly category = computed(() => { const state = this.state(); return state.status === 'loaded' ? state.data.category : null; });
  readonly products = computed(() => { const state = this.state(); return state.status === 'loaded' ? state.data.products : []; });
  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => [
    { label: 'Home', url: '/home' },
    { label: this.category()?.name ?? 'CatÃ¡logo' },
  ]);
}
