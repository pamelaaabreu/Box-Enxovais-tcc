import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { CategoryComponent } from './category.component';
import { CatalogService } from '../../services/catalog.service';
import { CatalogProduct } from '../../../../shared/types/catalog/catalog-product';
import type { Page } from '../../../../shared/types/api/pagination';

const emptyPage: Page<CatalogProduct> = {
  items: [],
  pagination: { offset: 0, limit: 12, total: 0, hasMore: false },
};

describe('CategoryComponent route state', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: null }],
    }),
  );
  it('updates the same instance on a slug change and ignores an older pending response', () => {
    const params = new BehaviorSubject(convertToParamMap({ slug: 'cama' }));
    const pending = new Subject<Page<CatalogProduct>>();
    const service = jasmine.createSpyObj<CatalogService>('CatalogService', [
      'getCategoryBySlug',
      'getCategoryPage',
      'getProductsByCategory',
    ]);
    service.getProductsByCategory.and.returnValue(of([]));
    service.getCategoryBySlug.and.callFake((slug) =>
      of({ id: 1, name: slug, slug }),
    );
    service.getCategoryPage.and.callFake((category) =>
      category.slug === 'cama' ? pending : of(emptyPage),
    );
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({})),
            paramMap: params,
          },
        },
        { provide: CatalogService, useValue: service },
      ],
    });
    TestBed.overrideComponent(CategoryComponent, {
      set: { template: '', imports: [] },
    });
    const fixture = TestBed.createComponent(CategoryComponent);
    expect(fixture.componentInstance.state().status).toBe('loading');
    params.next(convertToParamMap({ slug: 'mesa' }));
    expect(fixture.componentInstance.category()?.slug).toBe('mesa');
    pending.next(emptyPage);
    pending.complete();
    expect(fixture.componentInstance.category()?.slug).toBe('mesa');
    expect(fixture.componentInstance.products()).toEqual([]);
  });
  it('combines filters on the server and resets pagination when a filter changes', () => {
    const getCategoryPage = jasmine
      .createSpy('getCategoryPage')
      .and.returnValue(of(emptyPage));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({})),
            paramMap: of(convertToParamMap({ slug: 'cama' })),
          },
        },
        {
          provide: CatalogService,
          useValue: {
            getCategoryBySlug: () => of({ id: 1, name: 'Cama', slug: 'cama' }),
            getCategoryPage,
          },
        },
      ],
    });
    TestBed.overrideComponent(CategoryComponent, {
      set: { template: '', imports: [] },
    });
    const page = TestBed.createComponent(CategoryComponent).componentInstance;
    page.movePage(1);
    expect(getCategoryPage.calls.mostRecent().args[1].offset).toBe(12);
    page.applyFilters('  Toalha %  ', '100', true, 'price_asc');
    expect(getCategoryPage.calls.mostRecent().args[1]).toEqual({
      offset: 0,
      limit: 12,
      filters: {
        search__contains: 'Toalha %',
        price__lte: '100',
        stock__gte: 1,
        sort: 'price_asc',
      },
    });
  });

  it('exposes an error state rather than a redirect when loading fails', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({})),
            paramMap: of(convertToParamMap({ slug: 'cama' })),
          },
        },
        {
          provide: CatalogService,
          useValue: {
            getCategoryBySlug: () => of({ id: 1, name: 'Cama', slug: 'cama' }),
            getCategoryPage: () => throwError(() => new Error('Unavailable')),
          },
        },
      ],
    });
    TestBed.overrideComponent(CategoryComponent, {
      set: { template: '', imports: [] },
    });
    const fixture = TestBed.createComponent(CategoryComponent);
    expect(fixture.componentInstance.state().status).toBe('error');
  });

  for (const category of [
    { name: 'Toalhas', slug: 'toalhas' },
    { name: 'Mesa', slug: 'mesa' },
  ]) {
    it(`shows ${category.slug} facets and sends color, type and collection filters to the server`, () => {
      const products = [
        {
          id: 1,
          name: 'Toalha',
          product_type_id: 7,
          measurements: {
            Cor: 'Areia',
            Tipo: 'Toalha de banho',
            Coleção: 'Essência',
            collection_slug: 'toalhas-essencia',
          },
        },
        {
          id: 2,
          name: 'Jogo',
          product_type_id: 7,
          measurements: {
            Cor: 'Terracota',
            Tipo: 'Jogo de toalhas',
            Coleção: 'Spa',
            collection_slug: 'toalhas-spa',
          },
        },
      ].map((product) => ({
        ...product,
        price: 79.9,
        quantity: 12,
        status: 'active',
        promotional_price: 0,
        slug: String(product.id),
        active: true,
        featured: false,
        description: '',
        category: { id: 7, name: 'Toalhas', slug: 'toalhas' },
        images: [],
        variants: [],
      })) as CatalogProduct[];
      const getCategoryPage = jasmine
        .createSpy('getCategoryPage')
        .and.returnValue(of(emptyPage));
      TestBed.configureTestingModule({
        providers: [
          {
            provide: ActivatedRoute,
            useValue: {
              queryParamMap: of(convertToParamMap({})),
              paramMap: of(convertToParamMap({ slug: category.slug })),
            },
          },
          {
            provide: CatalogService,
            useValue: {
              getCategoryBySlug: () => of({ id: 7, ...category }),
              getProductsByCategory: () => of(products),
              getCategoryPage,
            },
          },
        ],
      });
      TestBed.overrideComponent(CategoryComponent, {
        set: { template: '', imports: [] },
      });
      const page = TestBed.createComponent(CategoryComponent).componentInstance;
      expect(page.facets().map((facet) => facet.key)).toEqual([
        'color',
        'type',
      ]);
      expect(page.collections().map((option) => option[0])).toEqual([
        'toalhas-essencia',
        'toalhas-spa',
      ]);
      page.setFacet('type', 'Toalha de banho');
      page.setFacet('color', 'Areia');
      page.setFacet('collection', 'toalhas-essencia');
      expect(getCategoryPage.calls.mostRecent().args[1].filters).toEqual({
        type: 'Toalha de banho',
        color: 'Areia',
        collection: 'toalhas-essencia',
      });
      page.clearFilters();
      expect(getCategoryPage.calls.mostRecent().args[1].filters).toEqual({});
    });
  }
  it('loads cushion cover filters from real attributes and combines type, dimension, color and collection', () => {
    const products = [
      {
        id: 101,
        name: 'Capa de Almofada Tricô Losangos Oliva',
        price: 69.9,
        quantity: 8,
        status: 'active',
        product_type_id: 9,
        measurements: {
          Tipo: 'Tricô',
          Cor: 'Oliva',
          Tamanho: '50 × 50 cm',
          Coleção: 'Tricô Losangos',
          collection_slug: 'almofadas-tricot-losangos',
        },
        category: { id: 9, name: 'Almofadas', slug: 'almofadas' },
        images: [],
        variants: [],
        active: true,
        featured: false,
        slug: 'capa-101',
        description: '',
        promotional_price: 0,
      },
    ] as CatalogProduct[];
    const getProductsByCategory = jasmine
      .createSpy('getProductsByCategory')
      .and.returnValue(of(products));
    const getCategoryPage = jasmine
      .createSpy('getCategoryPage')
      .and.returnValue(of(emptyPage));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({})),
            paramMap: of(convertToParamMap({ slug: 'almofadas' })),
          },
        },
        {
          provide: CatalogService,
          useValue: {
            getCategoryBySlug: () =>
              of({ id: 9, name: 'Almofadas', slug: 'almofadas' }),
            getProductsByCategory,
            getCategoryPage,
          },
        },
      ],
    });
    TestBed.overrideComponent(CategoryComponent, {
      set: { template: '', imports: [] },
    });
    const page = TestBed.createComponent(CategoryComponent).componentInstance;
    expect(getProductsByCategory).toHaveBeenCalledOnceWith('almofadas');
    expect(page.facets().map((f) => f.key)).toEqual(['color', 'type', 'size']);
    page.setFacet('type', 'Tricô');
    page.setFacet('size', '50 × 50 cm');
    page.setFacet('color', 'Oliva');
    page.setFacet('collection', 'almofadas-tricot-losangos');
    expect(getCategoryPage.calls.mostRecent().args[1].filters).toEqual({
      type: 'Tricô',
      size: '50 × 50 cm',
      color: 'Oliva',
      collection: 'almofadas-tricot-losangos',
    });
    page.clearFilters();
    expect(getCategoryPage.calls.mostRecent().args[1].filters).toEqual({});
  });

  it('combines decoration type, material and opacity', () => {
    const getCategoryPage = jasmine
      .createSpy('getCategoryPage')
      .and.returnValue(of(emptyPage));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({})),
            paramMap: of(convertToParamMap({ slug: 'decoracao' })),
          },
        },
        {
          provide: CatalogService,
          useValue: {
            getCategoryBySlug: () =>
              of({ id: 10, name: 'Decoração', slug: 'decoracao' }),
            getProductsByCategory: () => of([]),
            getCategoryPage,
          },
        },
      ],
    });
    TestBed.overrideComponent(CategoryComponent, {
      set: { template: '', imports: [] },
    });
    const page = TestBed.createComponent(CategoryComponent).componentInstance;
    expect(page.facets().map((f) => f.key)).toEqual([
      'type',
      'color',
      'size',
      'material',
      'opacity',
    ]);
    page.setFacet('type', 'Cortinas');
    page.setFacet('opacity', 'blackout');
    page.setFacet('material', 'Poliéster');
    expect(getCategoryPage.calls.mostRecent().args[1].filters).toEqual({
      type: 'Cortinas',
      opacity: 'blackout',
      material: 'Poliéster',
    });
    page.clearFilters();
    expect(getCategoryPage.calls.mostRecent().args[1].filters).toEqual({});
  });

  it('restores pagination, sorting and combined filters from the URL', () => {
    const query = new BehaviorSubject(
      convertToParamMap({
        page: '2',
        sort: 'price_desc',
        q: 'Tapete',
        maxPrice: '100',
        available: '1',
        color: 'Areia',
        type: 'Tapetes',
        collection: 'natural',
      }),
    );
    const getCategoryPage = jasmine
      .createSpy('getCategoryPage')
      .and.returnValue(of(emptyPage));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: query,
            paramMap: of(convertToParamMap({ slug: 'decoracao' })),
          },
        },
        {
          provide: CatalogService,
          useValue: {
            getCategoryBySlug: () =>
              of({ id: 10, name: 'Decoração', slug: 'decoracao' }),
            getProductsByCategory: () => of([]),
            getCategoryPage,
          },
        },
      ],
    });
    TestBed.overrideComponent(CategoryComponent, {
      set: { template: '', imports: [] },
    });
    const page = TestBed.createComponent(CategoryComponent).componentInstance;
    expect(page.pageNumber()).toBe(2);
    expect(getCategoryPage.calls.mostRecent().args[1]).toEqual({
      offset: 12,
      limit: 12,
      filters: {
        search__contains: 'Tapete',
        price__lte: '100',
        stock__gte: 1,
        color: 'Areia',
        type: 'Tapetes',
        collection: 'natural',
        sort: 'price_desc',
      },
    });
    query.next(convertToParamMap({ page: '3', sort: 'name' }));
    expect(page.pageNumber()).toBe(3);
    expect(page.criteria().color).toBe('');
    expect(getCategoryPage.calls.mostRecent().args[1]).toEqual({
      offset: 24,
      limit: 12,
      filters: { sort: 'name' },
    });
  });

  it('writes filter and page state to the URL while retaining unrelated parameters', () => {
    const navigate = jasmine.createSpy('navigate').and.resolveTo(true);
    TestBed.overrideProvider(Router, { useValue: { navigate } });
    const params = new BehaviorSubject(
      convertToParamMap({ page: '2', color: 'Areia', sort: 'name' }),
    );
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: params,
            paramMap: of(convertToParamMap({ slug: 'mesa' })),
          },
        },
        {
          provide: CatalogService,
          useValue: {
            getCategoryBySlug: () => of({ id: 7, name: 'Mesa', slug: 'mesa' }),
            getProductsByCategory: () => of([]),
            getCategoryPage: () => of(emptyPage),
          },
        },
      ],
    });
    TestBed.overrideComponent(CategoryComponent, {
      set: { template: '', imports: [] },
    });
    const page = TestBed.createComponent(CategoryComponent).componentInstance;
    page.applyFilters('  Toalha  ', '100', true, 'price_asc');
    const options = navigate.calls.mostRecent().args[1];
    expect(options.queryParamsHandling).toBe('merge');
    expect(options.queryParams).toEqual(
      jasmine.objectContaining({
        page: null,
        q: 'Toalha',
        color: 'Areia',
        maxPrice: '100',
        available: '1',
        sort: 'price_asc',
      }),
    );
    params.next(convertToParamMap({ q: 'Toalha', sort: 'price_asc' }));
    expect(page.criteria().offset).toBe(0);
    page.clearFilters();
    expect(navigate.calls.mostRecent().args[1].queryParams.q).toBeNull();
  });
});
