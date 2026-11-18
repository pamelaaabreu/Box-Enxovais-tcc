import { CustomAlertService } from '../../../../core/services/custom-alert.service';
import { CAMA_GROUP } from '../../data/categories';
import { ShippingQuoteComponent } from './shipping-quote.component';
import { FavoriteButtonComponent } from '../../../../shared/favorite-button/favorite-button.component';
import { CartService } from '../../../../core/services/cart.service';
import { CurrencyPipe } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { ProductGridComponent } from '../../components/product-grid/product-grid.component';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  Subject,
  catchError,
  combineLatest,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { CatalogService } from '../../services/catalog.service';
import { CatalogState } from '../../interfaces/catalog-state';
import { CatalogProduct } from '../../interfaces/product.interface';
import { CatalogLayoutComponent } from '../../components/catalog-layout/catalog-layout.component';
import {
  BreadcrumbsComponent,
  BreadcrumbItem,
} from '../../components/breadcrumbs/breadcrumbs.component';
import { ProductGalleryComponent } from '../../components/product-gallery/product-gallery.component';
import { ProductPriceComponent } from '../../components/product-price/product-price.component';
import { QuantitySelectorComponent } from '../../components/quantity-selector/quantity-selector.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    ShippingQuoteComponent,
    CurrencyPipe,
    FavoriteButtonComponent,
    MatIconModule,
    MatTabsModule,
    ProductGridComponent,
    RouterLink,
    CatalogLayoutComponent,
    BreadcrumbsComponent,
    ProductGalleryComponent,
    ProductPriceComponent,
    QuantitySelectorComponent,
  ],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailComponent {
  readonly cart = inject(CartService);
  private readonly alerts = inject(CustomAlertService);
  readonly openingCheckout = signal(false);

  async buyNow(): Promise<void> {
    const product = this.product();
    if (!product || this.openingCheckout() || !this.canBuyNow()) return;
    this.openingCheckout.set(true);
    try {
      await this.cart.buyNow(
        product.id,
        this.quantity(),
        this.selectedVariant()?.id,
        !!this.selectedCartItem(),
      );
    } finally {
      this.openingCheckout.set(false);
    }
  }
  addToCart(): void {
    const product = this.product();
    if (!product || this.openingCheckout() || !this.canAddToCart()) return;
    this.cart.add(
      product.id,
      this.quantity(),
      this.selectedVariant()?.id,
      undefined,
      (message, status) => {
        if (status === 409) this.cart.load();
        if (status !== 401)
          this.alerts.error('Não foi possível adicionar à sacola', message);
      },
    );
  }
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CatalogService);
  readonly quantity = signal(1);
  readonly variantId = signal<number | null>(null);

  private readonly reload = new Subject<void>();

  retry(): void {
    this.reload.next();
  }

  readonly state = toSignal(
    combineLatest([
      this.route.paramMap,
      this.reload.pipe(startWith(undefined)),
    ]).pipe(
      switchMap(([params]) =>
        this.catalog.getProductBySlug(params.get('slug') ?? '').pipe(
          map(
            (data): CatalogState<CatalogProduct | null> => ({
              status: 'loaded',
              data,
            }),
          ),
          startWith<CatalogState<CatalogProduct | null>>({ status: 'loading' }),
          catchError(() =>
            of<CatalogState<CatalogProduct | null>>({ status: 'error' }),
          ),
        ),
      ),
    ),
    {
      initialValue: {
        status: 'loading',
      } as CatalogState<CatalogProduct | null>,
    },
  );

  readonly product = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.data : null;
  });
  readonly descriptionParagraphs = computed(() =>
    (this.product()?.description ?? '')
      .split(/\r?\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
  );
  readonly descriptionBrand = computed(() => {
    const brand = this.product()?.brand_name?.trim();
    return brand &&
      !this.descriptionParagraphs().some((paragraph) =>
        paragraph
          .toLocaleLowerCase('pt-BR')
          .includes(brand.toLocaleLowerCase('pt-BR')),
      )
      ? brand
      : '';
  });
  readonly characteristics = computed(() =>
    Object.entries(this.product()?.measurements ?? {}).filter(
      ([key, value]) =>
        ![
          'collection_slug',
          'coordinated_family',
          'coordinated_pair_type', 'catalog_slug',
        ].includes(key) &&
        value != null &&
        String(value).trim(),
    ),
  );

  readonly includedItems = computed(
    () =>
      this.selectedVariant()?.includedItems ??
      (this.product()?.measurements?.['Conteúdo'] ?? '')
        .split(/\r?\n|\s+\+\s+|;/)
        .map((item) => item.trim())
        .filter(Boolean),
  );

  readonly fixedSize = computed(
    () =>
      this.characteristics().find(
        ([key]) => key.trim().toLowerCase() === 'tamanho',
      )?.[1],
  );

  readonly sizes = computed(() => {
    const labels: Record<string, string> = {
      solteiro: 'Solteiro',
      casal: 'Casal',
      queen: 'Queen',
      super_king: 'Super king',
    };
    const measurements = this.characteristics();
    return Object.entries(labels).flatMap(([key, label]) => {
      const entry = measurements.find(
        ([name]) => name.trim().toLowerCase().replace(/\s+/g, '_') === key,
      );
      return entry ? [{ key: entry[0], label, value: entry[1] }] : [];
    });
  });

  readonly technicalMaterials = computed(() =>
    this.characteristics().filter(([key]) =>
      /^(material|tecido externo|composição(?: têxtil)?|enchimento|acabamento)$/i.test(
        key.trim(),
      ),
    ),
  );
  readonly otherCharacteristics = computed(() => {
    const attributes = this.characteristics().filter(
      ([key]) =>
        key !== 'Conteúdo' && key !== 'Marca' && !key.startsWith('Origem dos'),
    );
    return attributes;
  });

  readonly selectedCartItem = computed(() => {
    const productId = this.product()?.id;
    const variantId = this.selectedVariant()?.id ?? 0;
    return this.cart
      .cart()
      .items.find(
        (item) =>
          item.productId === productId && (item.variantId ?? 0) === variantId,
      );
  });

  readonly stock = computed(() => {
    const value =
      this.selectedCartItem()?.stock ??
      this.selectedVariant()?.stock ??
      this.product()?.stock ??
      this.product()?.quantity ??
      0;
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  });
  readonly recommendations = toSignal(
    toObservable(this.product).pipe(
      switchMap((product) =>
        product
          ? this.catalog.getRecommendations(product).pipe(
              catchError(() => of([])),
              startWith([]),
            )
          : of([]),
      ),
    ),
    { initialValue: [] },
  );

  readonly remainingStock = computed(() =>
    Math.max(0, this.stock() - (this.selectedCartItem()?.quantity ?? 0)),
  );
  readonly available = computed(
    () => this.product()?.status === 'active' && this.stock() > 0,
  );
  readonly cartNeedsAdjustment = computed(() => {
    const item = this.selectedCartItem();
    return (
      !!item &&
      (!this.available() || !item.available || item.quantity > this.stock())
    );
  });
  readonly showCartLink = computed(
    () =>
      !!this.selectedCartItem() &&
      (!this.available() || this.remainingStock() === 0),
  );
  readonly availabilityLabel = computed(() => {
    const stock = this.stock();
    if (!this.available()) return 'Produto indisponível';
    if (stock === 1) return 'Última unidade';
    if (stock <= 5) return `Últimas ${stock} unidades`;
    return 'Em estoque';
  });
  readonly canBuyNow = computed(() => {
    const item = this.selectedCartItem();
    return item
      ? this.available() &&
          !this.cartNeedsAdjustment() &&
          !this.cart.pending().has(item.productId)
      : this.canAddToCart();
  });
  readonly canAddToCart = computed(
    () =>
      this.available() &&
      Number.isInteger(this.quantity()) &&
      this.quantity() >= 1 &&
      this.quantity() <= this.remainingStock() &&
      !this.cart.pending().has(this.product()!.id),
  );

  readonly selectedVariant = computed(
    () =>
      this.product()?.variants.find(
        (variant) => variant.id === this.variantId(),
      ) ??
      this.product()?.variants.find((variant) => variant.stock > 0) ??
      this.product()?.variants[0] ??
      null,
  );
  readonly selectedPrice = computed(
    () => this.selectedVariant()?.price ?? this.product()?.price ?? 0,
  );
  readonly galleryImages = computed(() => {
    const images = this.selectedVariant()?.images;
    return images?.length ? images : (this.product()?.images ?? []);
  });
  readonly availableColors = computed(() => [
    ...new Set(this.product()?.variants.map((v) => v.color || 'Padrão') ?? []),
  ]);
  readonly availableSizes = computed(() => [
    ...new Set(this.product()?.variants.map((v) => v.size || 'Único') ?? []),
  ]);
  readonly selectedColor = computed(
    () => this.selectedVariant()?.color || 'Padrão',
  );
  readonly selectedSize = computed(
    () => this.selectedVariant()?.size || 'Único',
  );

  isColorAvailable(color: string): boolean {
    return (
      this.product()?.variants.some(
        (v) => (v.color || 'Padrão') === color && v.stock > 0,
      ) ?? false
    );
  }

  isSizeAvailable(size: string): boolean {
    return (
      this.product()?.variants.some(
        (v) =>
          (v.color || 'Padrão') === this.selectedColor() &&
          (v.size || 'Único') === size &&
          v.stock > 0,
      ) ?? false
    );
  }

  selectColor(color: string): void {
    const variants =
      this.product()?.variants.filter(
        (v) => (v.color || 'Padrão') === color && v.stock > 0,
      ) ?? [];
    const variant =
      variants.find((v) => (v.size || 'Único') === this.selectedSize()) ??
      variants[0];
    if (variant) {
      this.variantId.set(variant.id);
      this.quantity.set(1);
    }
  }

  selectSize(size: string): void {
    const variant = this.product()?.variants.find(
      (v) =>
        (v.color || 'Padrão') === this.selectedColor() &&
        (v.size || 'Único') === size &&
        v.stock > 0,
    );
    if (variant) {
      this.variantId.set(variant.id);
      this.quantity.set(1);
    }
  }

  swatchColor(color: string): string {
    const colors: Record<string, string> = {
      salvia: '#aab59a',
      creme: '#ede3cf',
      branco: '#ffffff',
      bege: '#ded3bf',
      verde: '#667255',
      cinza: '#b5b5ae',
      azul: '#8babb8',
      rosa: '#d5b8b1',
    };
    return (
      colors[
        color
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
      ] ?? '#ded3bf'
    );
  }

  readonly careInstructions = computed(() =>
    (this.product()?.care_instructions ?? '')
      .split(/\r\n?|\n|;/)
      .map((text) => text.trim().replace(/^(?:[-•]\s+|\d+[.)]\s+)/, ''))
      .filter(Boolean)
      .map((text) => {
        const normalized = text
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        let icon = 'info';
        if (/\ba seco\b/.test(normalized)) icon = 'dry-clean';
        else if (/\b(?:lavar|ciclo)\b/.test(normalized)) icon = 'wash';
        else if (/\balvejante\b/.test(normalized)) icon = 'bleach';
        else if (/\b(?:secar|secadora)\b/.test(normalized)) icon = 'dry';
        else if (/\bpassar\b/.test(normalized)) icon = 'iron';
        return { text, icon, prohibited: normalized.startsWith('nao ') };
      }),
  );

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const product = this.product();
    const camaSubcategory = CAMA_GROUP.types.includes(
      product?.category.name ?? '',
    );
    return product
      ? [
          { label: 'Home', url: '/home' },
          ...(camaSubcategory
            ? [{ label: 'Cama', url: '/categoria/cama' }]
            : []),
          ...(product.category.slug
            ? [
                {
                  label: camaSubcategory
                    ? product.category.name.slice('Cama / '.length)
                    : product.category.name,
                  url: '/categoria/' + product.category.slug,
                },
              ]
            : []),
          { label: product.name },
        ]
      : [{ label: 'Home', url: '/home' }, { label: 'Produto' }];
  });

  constructor() {
    effect(() => {
      const remaining = this.remainingStock();
      this.quantity.update((quantity) =>
        Math.min(quantity, Math.max(1, remaining)),
      );
    });
    effect(() => {
      // Angular may reuse this page when only the slug changes.
      this.product();
      this.quantity.set(1);
      this.variantId.set(null);
    });
  }
}
