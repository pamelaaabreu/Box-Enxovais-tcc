import { FavoriteButtonComponent } from '../../../../shared/favorite-button/favorite-button.component';
import { CATEGORIES } from '../../data/categories';
import { CartService } from '../../../../core/services/cart.service';
import { NotFoundComponent } from '../../../not-found/not-found.component';
import { KeyValuePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { CatalogService } from '../../services/catalog.service';
import { CatalogState } from '../../interfaces/catalog-state';
import { CatalogProduct } from '../../interfaces/product.interface';
import { CatalogLayoutComponent } from '../../components/catalog-layout/catalog-layout.component';
import { BreadcrumbsComponent, BreadcrumbItem } from '../../components/breadcrumbs/breadcrumbs.component';
import { ProductGalleryComponent } from '../../components/product-gallery/product-gallery.component';
import { ProductPriceComponent } from '../../components/product-price/product-price.component';
import { QuantitySelectorComponent } from '../../components/quantity-selector/quantity-selector.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [FavoriteButtonComponent, NotFoundComponent, RouterLink, KeyValuePipe, CatalogLayoutComponent, BreadcrumbsComponent, ProductGalleryComponent, ProductPriceComponent, QuantitySelectorComponent],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailComponent {
  readonly cart = inject(CartService);
  addToCart(): void { const product = this.product(); if (product && this.canAddToCart()) this.cart.add(product.id, this.quantity()); }
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CatalogService);
  readonly quantity = signal(1);
  readonly variantId = signal<number | null>(null);

  readonly state = toSignal(this.route.paramMap.pipe(
    switchMap(params => this.catalog.getProductBySlug(params.get('slug') ?? '').pipe(
      map((data): CatalogState<CatalogProduct | null> => ({ status: 'loaded', data })),
      startWith<CatalogState<CatalogProduct | null>>({ status: 'loading' }),
      catchError(() => of<CatalogState<CatalogProduct | null>>({ status: 'error' })),
    )),
  ), { initialValue: { status: 'loading' } as CatalogState<CatalogProduct | null> });

  readonly product = computed(() => { const state = this.state(); return state.status === 'loaded' ? state.data : null; });
  readonly stock = computed(() => {
    const value = this.product()?.stock ?? this.product()?.quantity ?? 0;
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  });
  readonly available = computed(() => this.product()?.status === 'active' && this.stock() > 0);
  readonly availabilityLabel = computed(() => {
    if (!this.available()) return 'Produto indisponível';
    if (this.stock() <= 5) return `Últimas ${this.stock()} unidades`;
    return 'Em estoque';
  });
  readonly canAddToCart = computed(() => this.available() && Number.isInteger(this.quantity()) && this.quantity() >= 1 && this.quantity() <= this.stock());

  readonly selectedVariant = computed(() => this.product()?.variants.find(variant => variant.id === this.variantId()) ?? this.product()?.variants.find(variant => variant.stock > 0) ?? this.product()?.variants[0] ?? null);
  readonly availableColors = computed(() => [...new Set(this.product()?.variants.map(v => v.color || 'PadrÃƒÂ£o') ?? [])]);
  readonly availableSizes = computed(() => [...new Set(this.product()?.variants.map(v => v.size || 'ÃƒÅ¡nico') ?? [])]);
  readonly selectedColor = computed(() => this.selectedVariant()?.color || 'PadrÃƒÂ£o');
  readonly selectedSize = computed(() => this.selectedVariant()?.size || 'ÃƒÅ¡nico');

  isColorAvailable(color: string): boolean {
    return this.product()?.variants.some(v => (v.color || 'PadrÃƒÂ£o') === color && v.stock > 0) ?? false;
  }

  isSizeAvailable(size: string): boolean {
    return this.product()?.variants.some(v => (v.color || 'PadrÃƒÂ£o') === this.selectedColor() && (v.size || 'ÃƒÅ¡nico') === size && v.stock > 0) ?? false;
  }

  selectColor(color: string): void {
    const variants = this.product()?.variants.filter(v => (v.color || 'PadrÃƒÂ£o') === color && v.stock > 0) ?? [];
    const variant = variants.find(v => (v.size || 'ÃƒÅ¡nico') === this.selectedSize()) ?? variants[0];
    if (variant) this.variantId.set(variant.id);
  }

  selectSize(size: string): void {
    const variant = this.product()?.variants.find(v => (v.color || 'PadrÃƒÂ£o') === this.selectedColor() && (v.size || 'ÃƒÅ¡nico') === size && v.stock > 0);
    if (variant) this.variantId.set(variant.id);
  }

  swatchColor(color: string): string {
    const colors: Record<string, string> = { salvia: '#aab59a', creme: '#ede3cf', branco: '#ffffff', bege: '#ded3bf', verde: '#667255', cinza: '#b5b5ae', azul: '#8babb8', rosa: '#d5b8b1' };
    return colors[color.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()] ?? '#ded3bf';
  }

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const product = this.product();
    return product ? [
      { label: 'Home', url: '/home' },
      { label: product.category.name, url: CATEGORIES.some(category => category.slug === product.category.slug) ? `/categoria/${product.category.slug}` : undefined },
      { label: product.name },
    ] : [{ label: 'Home', url: '/home' }, { label: 'Produto' }];
  });

  constructor() {
    effect(() => {
      // Angular may reuse this page when only the slug changes.
      this.product();
      this.quantity.set(1);
      this.variantId.set(null);
    });
  }
}
