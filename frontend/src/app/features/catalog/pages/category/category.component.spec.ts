import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { CategoryComponent } from './category.component';
import { CatalogService } from '../../services/catalog.service';
import { CatalogProduct } from '../../interfaces/product.interface';
import { Page } from '../../../../core/services/pagination.service';

const emptyPage: Page<CatalogProduct> = { items: [], pagination: { offset: 0, limit: 12, total: 0, hasMore: false } };

describe('CategoryComponent route state', () => {
  it('updates the same instance on a slug change and ignores an older pending response', () => {
    const params = new BehaviorSubject(convertToParamMap({ slug: 'cama' }));
    const pending = new Subject<Page<CatalogProduct>>();
    const service = jasmine.createSpyObj<CatalogService>('CatalogService', ['getCategoryBySlug', 'getCategoryPage']);
    service.getCategoryBySlug.and.callFake(slug => of({ id: 1, name: slug, slug }));
    service.getCategoryPage.and.callFake(category => category.slug === 'cama' ? pending : of(emptyPage));
    TestBed.configureTestingModule({ providers: [
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})), paramMap: params } },
      { provide: CatalogService, useValue: service },
    ] });
    TestBed.overrideComponent(CategoryComponent, { set: { template: '', imports: [] } });
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
    const getCategoryPage = jasmine.createSpy('getCategoryPage').and.returnValue(of(emptyPage));
    TestBed.configureTestingModule({ providers: [
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})), paramMap: of(convertToParamMap({ slug: 'cama' })) } },
      { provide: CatalogService, useValue: {
        getCategoryBySlug: () => of({ id: 1, name: 'Cama', slug: 'cama' }), getCategoryPage,
      } },
    ] });
    TestBed.overrideComponent(CategoryComponent, { set: { template: '', imports: [] } });
    const page = TestBed.createComponent(CategoryComponent).componentInstance;
    page.movePage(1);
    expect(getCategoryPage.calls.mostRecent().args[1].offset).toBe(12);
    page.applyFilters('  Toalha %  ', '100', true, 'price_asc');
    expect(getCategoryPage.calls.mostRecent().args[1]).toEqual({
      offset: 0, limit: 12,
      filters: { name__contains: 'Toalha %', price__lte: '100', stock__gte: 1, sort: 'price_asc' },
    });
  });

  it('exposes an error state rather than a redirect when loading fails', () => {
    TestBed.configureTestingModule({ providers: [
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})), paramMap: of(convertToParamMap({ slug: 'cama' })) } },
      { provide: CatalogService, useValue: {
        getCategoryBySlug: () => of({ id: 1, name: 'Cama', slug: 'cama' }),
        getCategoryPage: () => throwError(() => new Error('Unavailable')),
      } },
    ] });
    TestBed.overrideComponent(CategoryComponent, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(CategoryComponent);
    expect(fixture.componentInstance.state().status).toBe('error');
  });
});
