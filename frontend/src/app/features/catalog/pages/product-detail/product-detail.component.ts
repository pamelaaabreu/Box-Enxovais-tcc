import { FavoriteButtonComponent } from '../../../../shared/favorite-button/favorite-button.component';
import { CartService } from '../../../../core/services/cart.service';
import { CurrencyPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ProductGridComponent } from '../../components/product-grid/product-grid.component';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Subject, catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';
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
  imports: [CurrencyPipe, FavoriteButtonComponent, MatIconModule, ProductGridComponent, RouterLink, CatalogLayoutComponent, BreadcrumbsComponent, ProductGalleryComponent, ProductPriceComponent, QuantitySelectorComponent],
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

  private readonly reload = new Subject<void>();

  retry(): void { this.reload.next(); }

  readonly state = toSignal(combineLatest([this.route.paramMap, this.reload.pipe(startWith(undefined))]).pipe(
    switchMap(([params]) => this.catalog.getProductBySlug(params.get('slug') ?? '').pipe(
      map((data): CatalogState<CatalogProduct | null> => ({ status: 'loaded', data })),
      startWith<CatalogState<CatalogProduct | null>>({ status: 'loading' }),
      catchError(() => of<CatalogState<CatalogProduct | null>>({ status: 'error' })),
    )),
  ), { initialValue: { status: 'loading' } as CatalogState<CatalogProduct | null> });

  readonly product = computed(() => { const state = this.state(); return state.status === 'loaded' ? state.data : null; });
  readonly characteristics = computed(() => Object.entries(this.product()?.measurements ?? {})
    .filter(([, value]) => value != null && String(value).trim()));

  readonly sizes = computed(() => {
    const labels: Record<string, string> = {
      solteiro: 'Solteiro', casal: 'Casal', queen: 'Queen', super_king: 'Super king',
    };
    const measurements = this.characteristics();
    return Object.entries(labels).flatMap(([key, label]) => {
      const entry = measurements.find(([name]) => name.trim().toLowerCase().replace(/\s+/g, '_') === key);
      return entry ? [{ key: entry[0], label, value: entry[1] }] : [];
    });
  });

  readonly otherCharacteristics = computed(() => {
    if (this.product()?.variants.length) return this.characteristics();
    const sizeKeys = new Set(this.sizes().map(({ key }) => key));
    return this.characteristics().filter(([key]) => !sizeKeys.has(key));
  });

  readonly stock = computed(() => {
    const value = this.product()?.stock ?? this.product()?.quantity ?? 0;
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  });
  readonly recommendations = toSignal(toObservable(this.product).pipe(
    switchMap(product => product
      ? this.catalog.getRecommendations(product).pipe(catchError(() => of([])), startWith([]))
      : of([])),
  ), { initialValue: [] });

  readonly remainingStock = computed(() => {
    const product = this.product();
    const inCart = this.cart.cart().items.find(item => item.productId === product?.id);
    return Math.max(0, (inCart?.stock ?? this.stock()) - (inCart?.quantity ?? 0));
  });

  readonly available = computed(() => this.product()?.status === 'active' && this.stock() > 0);
  readonly availabilityLabel = computed(() => {
    if (!this.available()) return 'Produto indisponível';
    if (this.stock() <= 5) return `Últimas ${this.stock()} unidades`;
    return 'Em estoque';
  });
  readonly canAddToCart = computed(() => this.available() && Number.isInteger(this.quantity()) && this.quantity() >= 1 && this.quantity() <= this.remainingStock() && !this.cart.pending().has(this.product()!.id));

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

  readonly careInstructions = computed(() => (this.product()?.care_instructions ?? '')
    .split(/\r\n?|\n|;/)
    .map(text => text.trim().replace(/^(?:[-•]\s+|\d+[.)]\s+)/, ''))
    .filter(Boolean)
    .map(text => {
      const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      let icon = 'info_outline';
      if (/^(?:ciclo delicado|lavar em ciclo delicado)\b/.test(normalized)) icon = 'water_drop';
      if (/^nao (?:usar|utilizar) alvejante\b/.test(normalized)) icon = 'block';
      if (/^secar (?:a|na) sombra\b/.test(normalized)) icon = 'light_mode';
      return { text, icon };
    }));

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const product = this.product();
    return product ? [
      { label: 'Home', url: '/home' },
      ...(product.category.slug ? [{ label: product.category.name, url: "/categoria/" + product.category.slug }] : []),
      { label: product.name },
    ] : [{ label: 'Home', url: '/home' }, { label: 'Produto' }];
  });

  constructor() {
    effect(() => {
      const remaining = this.remainingStock();
      this.quantity.update(quantity => Math.min(quantity, Math.max(1, remaining)));
    });
    effect(() => {
      // Angular may reuse this page when only the slug changes.
      this.product();
      this.quantity.set(1);
      this.variantId.set(null);
    });
  }
}
