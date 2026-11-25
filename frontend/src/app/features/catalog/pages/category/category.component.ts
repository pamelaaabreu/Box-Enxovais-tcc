import { AdminStateComponent } from '../../../../shared/components/admin-state/admin-state.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CatalogToolbarComponent } from '../../components/catalog-toolbar/catalog-toolbar.component';
import { MatIconModule } from '@angular/material/icon';
import { NotFoundComponent } from '../../../not-found/not-found.component';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { CatalogService } from '../../services/catalog.service';
import { CatalogState } from '../../../../shared/types/catalog/catalog-state';
import { Category } from '../../../../shared/types/catalog/category';

import { CatalogLayoutComponent } from '../../components/catalog-layout/catalog-layout.component';
import { BreadcrumbsComponent } from '../../components/breadcrumbs/breadcrumbs.component';
import type { BreadcrumbItem } from '../../../../shared/types/ui/breadcrumb';
import { ProductGridComponent } from '../../components/product-grid/product-grid.component';

import { CATALOG_SWATCHES } from '../../data/catalog-swatches';
import { CAMA_GROUP } from '../../data/categories';

import type { CategoryData } from '../../../../shared/types/catalog/category-data';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [
    AdminStateComponent,
    PaginationComponent,
    CatalogToolbarComponent,
    MatIconModule,
    RouterLink,
    NotFoundComponent,
    CatalogLayoutComponent,
    BreadcrumbsComponent,
    ProductGridComponent,
  ],
  templateUrl: './category.component.html',
  styleUrl: './category.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router, { optional: true });
  private readonly catalog = inject(CatalogService);

  private readonly pageSize = 12;
  private readonly query = new BehaviorSubject({
    search: '',
    maxPrice: '',
    available: false,
    sort: '',
    offset: 0,
    color: '',
    size: '',
    pattern: '',
    type: '',
    material: '',
    opacity: '',
    collection: '',
  });
  readonly criteria = toSignal(this.query, { requireSync: true });

  private updateCriteria(criteria: typeof this.query.value): void {
    if (!this.router) {
      this.query.next(criteria);
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParamsHandling: 'merge',
      queryParams: {
        q: criteria.search || null,
        maxPrice: criteria.maxPrice || null,
        available: criteria.available ? '1' : null,
        sort: criteria.sort || null,
        page: criteria.offset ? criteria.offset / this.pageSize + 1 : null,
        color: criteria.color || null,
        size: criteria.size || null,
        pattern: criteria.pattern || null,
        type: criteria.type || null,
        material: criteria.material || null,
        opacity: criteria.opacity || null,
        collection: criteria.collection || null,
      },
    });
  }

  applyFilters(
    search: string,
    maxPrice: string,
    available: boolean,
    sort: string,
  ): void {
    this.updateCriteria({
      ...this.query.value,
      search: search.trim(),
      maxPrice,
      available,
      sort,
      offset: 0,
    });
  }

  movePage(delta: number): void {
    const current = this.query.value;
    this.updateCriteria({
      ...current,
      offset: Math.max(0, current.offset + delta * this.pageSize),
    });
  }

  readonly filtersOpen = signal(false);
  private readonly cama = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const slug = params.get('slug') ?? '';
        return slug === 'cama' || slug.startsWith('cama-')
          ? this.catalog.getCategoryBySlug('cama').pipe(
              switchMap((group) =>
                group?.children?.length
                  ? this.catalog.getBedSubcategoryProducts(group).pipe(
                      map((products) => ({ group, products })),
                      catchError(() => of({ group, products: [] })),
                    )
                  : of(null),
              ),
              catchError(() => of(null)),
            )
          : of(null);
      }),
    ),
    { initialValue: null },
  );

  readonly groups = computed(() => this.cama()?.group.children ?? []);
  private readonly pillowFacets = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) =>
        params.get('slug') === 'travesseiros'
          ? this.catalog
              .getProductsByCategory('travesseiros')
              .pipe(catchError(() => of([])))
          : of([]),
      ),
    ),
    { initialValue: [] },
  );

  private readonly accessoryFacets = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) =>
        ['toalhas', 'almofadas', 'mesa', 'decoracao'].includes(
          params.get('slug') ?? '',
        )
          ? this.catalog
              .getProductsByCategory(params.get('slug')!)
              .pipe(catchError(() => of([])))
          : of([]),
      ),
    ),
    { initialValue: [] },
  );

  readonly facets = computed(() => {
    const category = this.category();
    const pillows = category?.slug === 'travesseiros';
    const products = pillows
      ? this.pillowFacets()
      : ['toalhas', 'almofadas', 'mesa', 'decoracao'].includes(
            category?.slug ?? '',
          )
        ? this.accessoryFacets()
        : (this.cama()?.products ?? []).filter(
            (p) =>
              category?.slug === 'cama' || p.product_type_id === category?.id,
          );
    const fields = pillows
      ? ([['size', 'Tamanho']] as const)
      : category?.slug === 'decoracao'
        ? ([
            ['type', 'Tipo'],
            ['color', 'Cor'],
            ['size', 'Tamanho'],
            ['material', 'Material'],
            ['opacity', 'Opacidade'],
          ] as const)
        : category?.slug === 'almofadas'
          ? ([
              ['color', 'Cor'],
              ['type', 'Tipo'],
              ['size', 'Tamanho'],
            ] as const)
          : ['toalhas', 'mesa'].includes(category?.slug ?? '')
            ? ([
                ['color', 'Cor'],
                ['type', 'Tipo'],
              ] as const)
            : ([
                ['color', 'Cor'],
                ['size', 'Tamanho'],
                ['pattern', 'Estampa'],
              ] as const);
    return fields.map(([key, label]) => ({
      key,
      label,
      values: [
        ...new Set(
          products
            .map((p) => p.measurements?.[label])
            .filter((v): v is string => typeof v === 'string' && !!v.trim()),
        ),
      ].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    }));
  });
  readonly collections = computed(() => {
    const category = this.category();
    const products = ['toalhas', 'almofadas', 'mesa', 'decoracao'].includes(
      category?.slug ?? '',
    )
      ? this.accessoryFacets()
      : (this.cama()?.products ?? []).filter(
          (p) =>
            category?.slug === 'cama' || p.product_type_id === category?.id,
        );
    const options = new Map<string, string>();
    for (const product of products) {
      const label = product.measurements?.['Coleção']?.trim();
      if (label)
        options.set(product.measurements?.['collection_slug'] || label, label);
    }
    return [...options.entries()].sort((a, b) =>
      a[1].localeCompare(b[1], 'pt-BR'),
    );
  });

  colorSwatch(value: string): string {
    const key = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, ' ');
    return CATALOG_SWATCHES[key] ?? '#d5d4cc';
  }

  setFacet(
    key:
      | 'color'
      | 'size'
      | 'pattern'
      | 'collection'
      | 'type'
      | 'material'
      | 'opacity',
    value: string,
  ): void {
    const current = this.query.value;
    this.updateCriteria({
      ...current,
      [key]: current[key] === value ? '' : value,
      offset: 0,
    });
  }

  clearFilters(): void {
    this.updateCriteria({
      search: '',
      maxPrice: '',
      available: false,
      sort: '',
      offset: 0,
      color: '',
      size: '',
      pattern: '',
      type: '',
      material: '',
      opacity: '',
      collection: '',
    });
  }

  private readonly resolvedCategory = signal<Category | null>(null);

  readonly state = toSignal(
    combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
      switchMap(([params, query]) => {
        const slug = params.get('slug') ?? '';
        this.resolvedCategory.set(null);
        this.query.next({
          search: (query.get('q') ?? '').trim().slice(0, 120),
          maxPrice: /^\d+(?:\.\d{1,2})?$/.test(query.get('maxPrice') ?? '')
            ? query.get('maxPrice')!
            : '',
          available: query.get('available') === '1',
          sort: ['', 'price_asc', 'price_desc', 'name', 'recent'].includes(
            query.get('sort') ?? '',
          )
            ? (query.get('sort') ?? '')
            : '',
          offset:
            Math.max(
              0,
              Math.min(1000000, Math.floor(Number(query.get('page')) || 1)) - 1,
            ) * this.pageSize,
          color: (query.get('color') ?? '').slice(0, 120),
          size: (query.get('size') ?? '').slice(0, 120),
          pattern: (query.get('pattern') ?? '').slice(0, 120),
          type: (query.get('type') ?? '').slice(0, 120),
          material: (query.get('material') ?? '').slice(0, 120),
          opacity: (query.get('opacity') ?? '').slice(0, 120),
          collection: (query.get('collection') ?? '').trim().slice(0, 120),
        });
        return this.catalog.getCategoryBySlug(slug).pipe(
          switchMap((category) => {
            this.resolvedCategory.set(category);
            return this.query.pipe(
              switchMap(
                ({
                  search,
                  maxPrice,
                  available,
                  sort,
                  offset,
                  color,
                  size,
                  pattern,
                  type,
                  material,
                  opacity,
                  collection,
                }) => {
                  if (!category)
                    return of<CatalogState<CategoryData>>({
                      status: 'loaded',
                      data: {
                        category,
                        products: [],
                        total: 0,
                        hasMore: false,
                      },
                    });
                  const filters: Record<string, string | number> = {};
                  if (search) filters['search__contains'] = search;
                  if (maxPrice) filters['price__lte'] = maxPrice;
                  if (available) filters['stock__gte'] = 1;
                  if (color) filters['color'] = color;
                  if (size) filters['size'] = size;
                  if (pattern) filters['pattern'] = pattern;
                  if (type) filters['type'] = type;
                  if (material) filters['material'] = material;
                  if (opacity) filters['opacity'] = opacity;
                  if (collection) filters['collection'] = collection;
                  if (sort) filters['sort'] = sort;
                  return this.catalog
                    .getCategoryPage(category, {
                      offset,
                      limit: this.pageSize,
                      filters,
                    })
                    .pipe(
                      map(
                        ({
                          items,
                          pagination,
                        }): CatalogState<CategoryData> => ({
                          status: 'loaded',
                          data: {
                            category,
                            products: items,
                            total: pagination.total,
                            hasMore: pagination.hasMore,
                          },
                        }),
                      ),
                      startWith<CatalogState<CategoryData>>({
                        status: 'loading',
                      }),
                      catchError(() =>
                        of<CatalogState<CategoryData>>({ status: 'error' }),
                      ),
                    );
                },
              ),
            );
          }),
          catchError(() => of<CatalogState<CategoryData>>({ status: 'error' })),
          startWith<CatalogState<CategoryData>>({ status: 'loading' }),
        );
      }),
    ),
    { initialValue: { status: 'loading' } as CatalogState<CategoryData> },
  );

  readonly page = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.data : null;
  });
  readonly pageNumber = computed(
    () => this.criteria().offset / this.pageSize + 1,
  );

  readonly pageCount = computed(() =>
    Math.ceil((this.page()?.total ?? 0) / this.pageSize),
  );

  goToPage(page: number | 'start-gap' | 'end-gap'): void {
    if (
      typeof page === 'number' &&
      page >= 1 &&
      page <= this.pageCount() &&
      page !== this.pageNumber()
    ) {
      this.movePage(page - this.pageNumber());
    }
  }

  readonly category = this.resolvedCategory.asReadonly();
  readonly products = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.data.products : [];
  });
  readonly isCamaCategory = computed(() => {
    const category = this.category();
    return (
      category?.slug === CAMA_GROUP.slug ||
      CAMA_GROUP.types.includes(category?.name ?? '')
    );
  });
  readonly categoryTitle = computed(() => {
    const name = this.category()?.name ?? 'Catálogo';
    return CAMA_GROUP.types.includes(name)
      ? name.slice('Cama / '.length)
      : name;
  });
  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => [
    { label: 'Home', url: '/inicio' },
    ...(CAMA_GROUP.types.includes(this.category()?.name ?? '')
      ? [{ label: 'Cama', url: '/categoria/cama' }]
      : []),
    { label: this.categoryTitle() },
  ]);
}
