import { ProductReviewService } from '../../../../core/services/product-review.service';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CartService } from '../../../../core/services/cart.service';
import { FavoritesService } from '../../../../core/services/favorites.service';
import { CatalogProduct } from '../../../../shared/types/catalog/catalog-product';
import { ProductCardComponent } from './product-card.component';

describe('ProductCardComponent', () => {
  const product: CatalogProduct = {
    sku: 'BX-CAM-012',
    id: 12,
    slug: 'essencia-verde-oliva',
    name: 'Essência Floral — Verde Oliva',
    status: 'active',
    promotional_price: 0,
    price: 239.9,
    quantity: 8,
    active: true,
    featured: false,
    description: '',
    category: { id: 1, name: 'Cama / Jogos de cama', slug: 'jogos-de-cama' },
    measurements: {
      Coleção: 'Essência Floral',
      Cor: 'Verde Oliva',
      Estampa: 'Floral',
    },
    images: [],
    variants: [],
  };

  function setup(data = product, catalogTile = false) {
    const pending = signal(new Set<number>());
    const items = signal<{ id: number; productId: number; quantity: number }[]>(
      [],
    );
    const feedback = signal<Record<number, string>>({});
    const add = jasmine
      .createSpy('add')
      .and.callFake((id: number) => pending.set(new Set([id])));
    const isFavorite = signal(false);
    const toggle = jasmine
      .createSpy('toggle')
      .and.callFake(() => isFavorite.update((value) => !value));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ProductReviewService,
          useValue: { summaries: signal({}), ensureSummary: () => {} },
        },
        {
          provide: CartService,
          useValue: {
            pending,
            cart: () => ({ items: items() }),
            add,
            feedback,
          },
        },
        {
          provide: FavoritesService,
          useValue: {
            pending: () => new Set(),
            authenticated: () => true,
            loading: () => false,
            synchronized: () => true,
            errors: () => ({}),
            syncError: () => '',
            isFavorite,
            toggle,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(ProductCardComponent);
    fixture.componentRef.setInput('product', data);
    fixture.componentRef.setInput('catalogTile', catalogTile);
    fixture.detectChanges();
    return {
      fixture,
      host: fixture.nativeElement as HTMLElement,
      items,
      add,
      toggle,
      pending,
      feedback,
    };
  }

  it('shows stored attributes, localized price and the product-specific link', () => {
    const { host } = setup();
    expect(host.querySelector('.product-sku')?.textContent).toBe(
      'SKU: BX-CAM-012',
    );
    expect(host.querySelector('h2')?.textContent).toBe(
      'Essência Floral Verde Oliva',
    );
    expect(host.querySelector('.info-badge')?.textContent).toBe(
      'Essência Floral',
    );
    expect(host.querySelector('.attributes')?.textContent).toContain(
      'Cor: Verde Oliva',
    );
    expect(
      host.querySelector('.price-badge')?.textContent?.replace(/\s+/g, ' '),
    ).toBe('R$ 239,90');
    expect(host.querySelector('.card-actions a')?.getAttribute('href')).toBe(
      '/produto/essencia-verde-oliva',
    );
    expect(host.textContent).not.toContain('sem juros');
  });

  it('keeps SKU below the title in every product-card variation and reserves only one compact line', () => {
    const { fixture, host } = setup();
    for (const variation of [
      'homeTile',
      'favoritesTile',
      'compact',
      'catalogTile',
    ]) {
      fixture.componentRef.setInput(variation, true);
      fixture.detectChanges();
      const sku = host.querySelector<HTMLElement>('.product-sku')!;
      expect(host.querySelector('h2')?.nextElementSibling?.tagName).toBe(
        'APP-PRODUCT-RATING',
      );
      expect(host.querySelector('app-product-rating')?.nextElementSibling).toBe(
        sku,
      );
      expect(sku.textContent).toBe('SKU: BX-CAM-012');
      expect(getComputedStyle(sku).whiteSpace).toBe('nowrap');
      fixture.componentRef.setInput(variation, false);
    }
    fixture.componentRef.setInput('product', { ...product, sku: undefined });
    fixture.detectChanges();
    expect(host.querySelector('.product-sku')?.textContent).toBe('');
    expect(
      host.querySelector('.product-sku')?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('toggles favorites separately and prevents another add while awaiting the cart', () => {
    const { host, fixture, add, toggle } = setup();
    const favorite = host.querySelector<HTMLButtonElement>(
      '.favorite-action button',
    )!;
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
    expect(host.querySelector('.info-badge')?.textContent).toBe(
      'Essência Floral',
    );
    items.set([{ id: 48, productId: 12, quantity: 2 }]);
    fixture.detectChanges();
    const button = host.querySelector<HTMLButtonElement>(
      '.card-actions button',
    )!;
    expect(button.disabled).toBeTrue();
    button.click();
    expect(add).not.toHaveBeenCalled();
    fixture.componentRef.setInput('product', { ...product, quantity: 0 });
    fixture.detectChanges();
    expect(button.textContent).toContain('Indisponível');
    expect(button.disabled).toBeTrue();
  });

  it('reflects confirmed cart quantities without rendering a success message', () => {
    const { host, fixture, items, feedback, pending, add } = setup(
      product,
      true,
    );
    const button = host.querySelector<HTMLButtonElement>(
      '.card-actions button',
    )!;
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
    expect(
      host.querySelector('.card-actions [role="status"]')?.textContent,
    ).toContain('Sem conexão');

    items.set([{ id: 48, productId: 12, quantity: 1 }]);
    feedback.set({ 12: 'Adicionado ao carrinho.' });
    fixture.detectChanges();
    expect(button.textContent).toContain('Adicionado ao carrinho');
    expect(host.querySelector('.card-actions [role="status"]')).toBeNull();
    expect(button.disabled).toBeFalse();
    button.click();
    expect(add.calls.allArgs()).toEqual([
      [12, 1],
      [12, 1],
    ]);

    pending.set(new Set());
    items.set([]);
    feedback.set({});
    fixture.detectChanges();
    expect(button.textContent).toContain('Adicionar ao carrinho');
  });
  it('keeps one compact image proportion for every category and uses a card photograph without changing the gallery', () => {
    const image = {
      id: 1,
      url: '/original-square.webp',
      cardUrl: '/landscape-card.webp',
      alt: 'Tapete inteiro',
      position: 0,
      fit: 'contain' as const,
    };
    const { fixture, host } = setup({ ...product, images: [image] }, true);
    expect(getComputedStyle(host.querySelector('.media')!).aspectRatio).toBe(
      '4 / 3',
    );
    expect(fixture.componentInstance.cardImage()?.url).toBe(
      '/landscape-card.webp',
    );
    expect(fixture.componentInstance.product().images[0].url).toBe(
      '/original-square.webp',
    );
    expect(host.querySelector('img')?.getAttribute('src')).toBe(
      '/landscape-card.webp',
    );
    for (const name of [
      'Cama',
      'Travesseiros',
      'Toalhas',
      'Almofadas',
      'Mesa',
      'Decoração',
    ]) {
      fixture.componentRef.setInput('product', {
        ...product,
        category: { id: 1, name, slug: name },
        images: [],
      });
      fixture.detectChanges();
      expect(getComputedStyle(host.querySelector('.media')!).aspectRatio).toBe(
        '4 / 3',
      );
    }
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();
    expect(getComputedStyle(host.querySelector('.media')!).aspectRatio).toBe(
      '4 / 3',
    );
  });

  it('keeps editorial details and secondary cart actions scoped to Home, including size selection', () => {
    const { fixture, host, add, toggle } = setup(product, true);
    fixture.componentRef.setInput('homeTile', true);
    fixture.detectChanges();
    expect(host.querySelector('.card-actions a')?.textContent?.trim()).toBe(
      'Ver detalhes',
    );
    host.querySelector<HTMLButtonElement>('.home-secondary')!.click();
    expect(add).toHaveBeenCalledOnceWith(12, 1);
    host.querySelector<HTMLButtonElement>('.favorite-action button')!.click();
    expect(toggle).toHaveBeenCalledOnceWith(12);
    fixture.componentRef.setInput('product', {
      ...product,
      variants: [{ id: 2, size: 'Queen', price: 259.9, stock: 2, images: [] }],
    });
    fixture.detectChanges();
    expect(host.querySelector('.card-actions button')).toBeNull();
    expect(host.querySelector('.home-secondary')?.textContent?.trim()).toBe(
      'Escolher tamanho',
    );
    expect(host.querySelector('.home-secondary')?.getAttribute('href')).toBe(
      '/produto/essencia-verde-oliva',
    );
  });

  it('uses the favorites variation without changing catalog cards or purchasing unavailable variants', () => {
    const { fixture, host, add } = setup(
      {
        ...product,
        variants: [
          { id: 1, size: 'Queen', price: 239.9, stock: 0, images: [] },
        ],
      },
      true,
    );
    fixture.componentRef.setInput('favoritesTile', true);
    fixture.componentRef.setInput('product', {
      ...fixture.componentInstance.product(),
      quantity: 0,
    });
    fixture.detectChanges();
    expect(host.querySelector('.card-actions a')).toBeNull();
    const buy = host.querySelector<HTMLButtonElement>('.card-actions button')!;
    expect(buy.disabled).toBeTrue();
    expect(buy.textContent).toContain('Indisponível');
    buy.click();
    expect(add).not.toHaveBeenCalled();
    expect(host.querySelector('.price-prefix')).toBeNull();
    fixture.componentRef.setInput('favoritesTile', false);
    fixture.detectChanges();
    expect(host.querySelector('.card-actions a')?.textContent?.trim()).toBe(
      'Ver detalhes',
    );
  });
});
