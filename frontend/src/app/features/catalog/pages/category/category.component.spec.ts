import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { CategoryComponent } from './category.component';
import { CatalogService } from '../../services/catalog.service';
import { CatalogProduct } from '../../interfaces/product.interface';

describe('CategoryComponent route state', () => {
  it('updates the same instance on a slug change and ignores an older pending response', () => {
    const params = new BehaviorSubject(convertToParamMap({ slug: 'cama' }));
    const pending = new Subject<CatalogProduct[]>();
    const service = jasmine.createSpyObj<CatalogService>('CatalogService', ['getCategoryBySlug', 'getProductsByCategory']);
    service.getCategoryBySlug.and.callFake(slug => of({ id: 1, name: slug, slug }));
    service.getProductsByCategory.and.callFake(slug => slug === 'cama' ? pending : of([]));
    TestBed.configureTestingModule({ providers: [
      { provide: ActivatedRoute, useValue: { paramMap: params } },
      { provide: CatalogService, useValue: service },
    ] });
    TestBed.overrideComponent(CategoryComponent, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(CategoryComponent);
    expect(fixture.componentInstance.state().status).toBe('loading');
    params.next(convertToParamMap({ slug: 'mesa' }));
    expect(fixture.componentInstance.category()?.slug).toBe('mesa');
    pending.next([]);
    pending.complete();
    expect(fixture.componentInstance.category()?.slug).toBe('mesa');
    expect(fixture.componentInstance.products()).toEqual([]);
  });
  it('exposes an error state rather than a redirect when loading fails', () => {
    TestBed.configureTestingModule({ providers: [
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ slug: 'cama' })) } },
      { provide: CatalogService, useValue: {
        getCategoryBySlug: () => of(null),
        getProductsByCategory: () => throwError(() => new Error('Unavailable')),
      } },
    ] });
    TestBed.overrideComponent(CategoryComponent, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(CategoryComponent);
    expect(fixture.componentInstance.state().status).toBe('error');
  });
});
