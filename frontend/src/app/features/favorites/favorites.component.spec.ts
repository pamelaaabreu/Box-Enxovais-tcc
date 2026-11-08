import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FavoritesComponent } from './favorites.component';
import { FavoritesService } from '../../core/services/favorites.service';
import { CartService } from '../../core/services/cart.service';
import { CatalogService } from '../catalog/services/catalog.service';
import { CatalogLayoutComponent } from '../catalog/components/catalog-layout/catalog-layout.component';
import { Page } from '../../core/services/pagination.service';
import { Product } from '../../shared/models';

@Component({ selector: 'app-catalog-layout', standalone: true, template: '<ng-content />' })
class TestFavoritesLayout {}

describe('Favorites page', () => {
 it('renders loading, empty and retry states, and disables purchasing unavailable products', () => {
  const page = signal<Page<Product> | null>(null), pageLoading = signal(true), pageError = signal('');
  const favorites = {
   page, pageLoading, pageError, syncError: signal(''), loading: signal(false),
   synchronized: signal(true), pending: signal<ReadonlySet<number>>(new Set()),
   authenticated: () => true, errors: () => ({}), isFavorite: () => true,
   openPage: jasmine.createSpy(), closePage: jasmine.createSpy(), loadPage: jasmine.createSpy(),
   toggle: jasmine.createSpy(), remove: jasmine.createSpy(),
  };
  const cart = { pending: () => new Set(), feedback: () => ({}), add: jasmine.createSpy() };
  TestBed.configureTestingModule({ providers: [provideRouter([]),
   { provide: FavoritesService, useValue: favorites }, { provide: CartService, useValue: cart },
   { provide: CatalogService, useValue: { adapt: (p: Product) => ({ ...p, slug: String(p.id), active: p.status === 'active', category: { name: 'Casa' }, images: [] }) } },
  ] });
  TestBed.overrideComponent(FavoritesComponent, { remove: { imports: [CatalogLayoutComponent] }, add: { imports: [TestFavoritesLayout] } });
  const fixture = TestBed.createComponent(FavoritesComponent); fixture.detectChanges();
  expect(favorites.openPage).toHaveBeenCalled(); expect(fixture.nativeElement.textContent).toContain('Carregando favoritos');
  pageLoading.set(false); pageError.set('Falha de rede'); fixture.detectChanges();
  fixture.nativeElement.querySelector('.state button').click(); expect(favorites.loadPage).toHaveBeenCalled();
  pageError.set(''); page.set({ items: [], pagination: { offset: 0, limit: 20, total: 0, hasMore: false } }); fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('Sua lista ainda');
  page.set({ items: [
   { id: 1, name: 'Sem estoque', price: 10, quantity: 0, status: 'active', measurements: {} },
   { id: 2, name: 'Arquivado', price: 10, quantity: 5, status: 'archived', measurements: {} },
  ] as Product[], pagination: { offset: 0, limit: 20, total: 2, hasMore: false } }); fixture.detectChanges();
  const purchases: HTMLButtonElement[] = [...fixture.nativeElement.querySelectorAll('.actions button:first-child')];
  expect(purchases.length).toBe(2); expect(purchases.every(button => button.disabled)).toBeTrue();
  const inactiveLink = fixture.nativeElement.querySelectorAll('.product-link')[1];
  expect(inactiveLink.getAttribute('href')).toBeNull(); expect(inactiveLink.getAttribute('aria-disabled')).toBe('true');
  fixture.nativeElement.querySelectorAll('.remove')[1].click(); expect(favorites.remove).toHaveBeenCalledWith(2);
  fixture.destroy(); expect(favorites.closePage).toHaveBeenCalled();
 });
});
