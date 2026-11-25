import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { signal } from '@angular/core';
import { TopNavbarComponent } from './top-navbar.component';
import { ProductService } from '../../../core/services/product.service';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
describe('Dynamic product search', () => {
  const product = {
    id: 1,
    name: 'Floral',
    price: 100,
    status: 'active',
    sku: 'BX-001',
    measurements: {},
    image_paths: [],
    variants: [],
    promotional_price: 90,
    promotion_active: false,
  };
  function setup() {
    const products = jasmine.createSpyObj('ProductService', [
      'getProductsPage',
    ]);
    products.getProductsPage.and.returnValue(
      of({
        items: [product],
        pagination: { total: 1, hasMore: false, offset: 0, limit: 6 },
      }),
    );
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ProductService, useValue: products },
        { provide: CartService, useValue: { totalItems: signal(0) } },
        {
          provide: AuthService,
          useValue: {
            loadUser: () => {},
            isLoggedIn: () => false,
            getUserName: () => null,
            getUserRole: () => null,
            userChanged: new Subject(),
            savedNameChanged: new Subject(),
          },
        },
      ],
    });
    const f = TestBed.createComponent(TopNavbarComponent);
    f.detectChanges();
    return { f, products, c: f.componentInstance };
  }
  it('debounces fast changes, limits preview and keeps SKU search', fakeAsync(() => {
    const { c, products } = setup();
    c.changeSearch('f');
    tick(100);
    c.changeSearch('floral');
    tick(249);
    expect(products.getProductsPage).not.toHaveBeenCalled();
    tick(1);
    expect(products.getProductsPage).toHaveBeenCalledOnceWith({
      limit: 6,
      filters: { search__contains: 'floral' },
    });
    expect(c.searchResults()[0].name).toBe('Floral');
    c.changeSearch('BX-001');
    tick(250);
    expect(
      products.getProductsPage.calls.mostRecent().args[0].filters
        .search__contains,
    ).toBe('BX-001');
  }));
  it('cancels stale responses and clears without showing prior products', fakeAsync(() => {
    const { c, products } = setup();
    const old = new Subject<any>();
    products.getProductsPage.and.returnValue(old);
    c.changeSearch('old');
    tick(250);
    expect(old.observed).toBeTrue();
    c.changeSearch('new');
    expect(old.observed).toBeFalse();
    products.getProductsPage.and.returnValue(
      of({ items: [{ ...product, name: 'Novo' }], pagination: {} }),
    );
    tick(250);
    old.next({ items: [product] });
    expect(c.searchResults()[0].name).toBe('Novo');
    c.changeSearch('');
    expect(c.searchResults()).toEqual([]);
    expect(c.searchLoading()).toBeFalse();
    expect(c.searchOpen()).toBeFalse();
  }));
  it('supports arrow navigation, Enter and Escape', fakeAsync(() => {
    const { c } = setup();
    const router = TestBed.inject(Router);
    const nav = spyOn(router, 'navigate').and.resolveTo(true);
    c.changeSearch('floral');
    tick(250);
    c.searchKey(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(c.activeResult()).toBe(0);
    c.searchKey(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(nav).toHaveBeenCalledWith(['/produto', 'floral-1']);
    c.searchOpen.set(true);
    c.searchKey(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(c.searchOpen()).toBeFalse();
  }));
});
