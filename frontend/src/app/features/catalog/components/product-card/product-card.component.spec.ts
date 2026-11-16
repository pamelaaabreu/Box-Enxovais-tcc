import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CartService } from '../../../../core/services/cart.service';
import { FavoritesService } from '../../../../core/services/favorites.service';
import { CatalogProduct } from '../../interfaces/product.interface';
import { ProductCardComponent } from './product-card.component';

describe('ProductCardComponent', () => {
  const product: CatalogProduct = {
    id: 12, slug: 'essencia-verde-oliva', name: 'Essência Floral — Verde Oliva',
    status: 'active', promotional_price: 0, price: 239.9, quantity: 8, active: true, featured: false, description: '',
    category: { id: 1, name: 'Cama / Jogos de cama', slug: 'jogos-de-cama' },
    measurements: { Coleção: 'Essência Floral', Cor: 'Verde Oliva', Estampa: 'Floral' },
    images: [], variants: [],
  };

  function setup(data = product, catalogTile = false) {
    const pending = signal(new Set<number>());
    const items = signal<{ id: number; productId: number; quantity: number }[]>([]);
    const feedback = signal<Record<number, string>>({});
    const add = jasmine.createSpy('add').and.callFake((id: number) => pending.set(new Set([id])));
    const isFavorite = signal(false);
    const toggle = jasmine.createSpy('toggle').and.callFake(() => isFavorite.update(value => !value));
    TestBed.configureTestingModule({ providers: [
      provideRouter([]),
      { provide: CartService, useValue: { pending, cart: () => ({ items: items() }), add, feedback } },
      { provide: FavoritesService, useValue: {
        pending: () => new Set(), authenticated: () => true, loading: () => false,
        synchronized: () => true, errors: () => ({}), syncError: () => '', isFavorite, toggle,
      } },
    ] });
    const fixture = TestBed.createComponent(ProductCardComponent);
    fixture.componentRef.setInput('product', data);
    fixture.componentRef.setInput('catalogTile', catalogTile);
    fixture.detectChanges();
    return { fixture, host: fixture.nativeElement as HTMLElement, items, add, toggle, pending, feedback };
  }

  it('shows stored attributes, localized price and the product-specific link', () => {
    const { host } = setup();
    expect(host.querySelector('h2')?.textContent).toBe('Essência Floral Verde Oliva');
    expect(host.querySelector('.info-badge')?.textContent).toBe('Essência Floral');
    expect(host.querySelector('.attributes')?.textContent).toContain('Cor: Verde Oliva');
    expect(host.querySelector('.price-badge')?.textContent?.replace(/\s+/g, ' ')).toBe('R$ 239,90');
    expect(host.querySelector('.card-actions a')?.getAttribute('href')).toBe('/produto/essencia-verde-oliva');
    expect(host.textContent).not.toContain('sem juros');
  });

  it('toggles favorites separately and prevents another add while awaiting the cart', () => {
    const { host, fixture, add, toggle } = setup();
    const favorite = host.querySelector<HTMLButtonElement>('.favorite-action button')!;
    favorite.click();
    fixture.detectChanges();
    expect(toggle).toHaveBeenCalledOnceWith(12);
    expect(favorite.getAttribute('aria-pressed')).toBe('true');
    expect(add).not.toHaveBeenCalled();
    const buy = host.querySelector<HTMLButtonElement>('.card-actions button')!;
    buy.click();
    buy.click();
    fixture.detectChanges();
    expect(add).toHaveBeenCalledOnceWith(12, 1);
    expect(buy.disabled).toBeTrue();
  });

  it('prevents adding beyond available stock and marks unavailable products', () => {
    const { fixture, host, items, add } = setup({ ...product, quantity: 2 });
    expect(host.querySelector('.info-badge')?.textContent).toBe('Essência Floral');
    items.set([{ id: 48, productId: 12, quantity: 2 }]);
    fixture.detectChanges();
    const button = host.querySelector<HTMLButtonElement>('.card-actions button')!;
    expect(button.disabled).toBeTrue();
    button.click();
    expect(add).not.toHaveBeenCalled();
    fixture.componentRef.setInput('product', { ...product, quantity: 0 });
    fixture.detectChanges();
    expect(button.textContent).toContain('Indisponível');
    expect(button.disabled).toBeTrue();
  });

  it('reflects confirmed cart quantities without rendering a success message', () => {
    const { host, fixture, items, feedback, pending, add } = setup(product, true);
    const button = host.querySelector<HTMLButtonElement>('.card-actions button')!;
    const details = host.querySelector<HTMLAnchorElement>('.card-actions a')!;
    expect(details.nextElementSibling).toBe(button);
    expect(details.getAttribute('href')).toBe('/produto/essencia-verde-oliva');
    expect(button.textContent).toContain('Adicionar ao carrinho');
    button.click();
    fixture.detectChanges();
    expect(button.textContent).toContain('Adicionando');

    pending.set(new Set());
    feedback.set({ 12: 'Sem conexão. Tente novamente.' });
    fixture.detectChanges();
    expect(button.textContent).toContain('Adicionar ao carrinho');
    expect(host.querySelector('.card-actions [role="status"]')?.textContent).toContain('Sem conexão');

    items.set([{ id: 48, productId: 12, quantity: 1 }]);
    feedback.set({ 12: 'Adicionado ao carrinho.' });
    fixture.detectChanges();
    expect(button.textContent).toContain('Adicionado ao carrinho');
    expect(host.querySelector('.card-actions [role="status"]')).toBeNull();
    expect(button.disabled).toBeFalse();
    button.click();
    expect(add.calls.allArgs()).toEqual([[12, 1], [12, 1]]);

    pending.set(new Set());
    items.set([]);
    feedback.set({});
    fixture.detectChanges();
    expect(button.textContent).toContain('Adicionar ao carrinho');
  });
});
