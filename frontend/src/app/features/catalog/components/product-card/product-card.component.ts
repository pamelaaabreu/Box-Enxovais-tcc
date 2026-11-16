import { FavoriteButtonComponent } from '../../../../shared/favorite-button/favorite-button.component';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  inject,
  computed,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogProduct } from '../../interfaces/product.interface';
import { ProductMediaComponent } from '../product-media/product-media.component';
import { ProductPriceComponent } from '../product-price/product-price.component';

import { CartService } from '../../../../core/services/cart.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [
    MatIconModule,
    FavoriteButtonComponent,
    RouterLink,
    ProductMediaComponent,
    ProductPriceComponent,
  ],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent {
  readonly compact = input(false);
  readonly catalogTile = input(false);
  readonly product = input.required<CatalogProduct>();
  readonly cart = inject(CartService);
  readonly details = computed(() =>
    this.product().active ? ['/produto', this.product().slug] : null,
  );
  readonly available = computed(
    () => this.product().active && this.product().quantity > 0,
  );
  readonly displayName = computed(() => {
    const { name, measurements } = this.product();
    const color = measurements?.['Cor']?.trim();
    const suffix = color ? ' — ' + color : '';
    return suffix && name.endsWith(suffix)
      ? name.slice(0, -suffix.length) + ' ' + color
      : name;
  });
  readonly badge = computed(() =>
    this.product().measurements?.['Coleção']?.trim(),
  );
  readonly attributes = computed(() =>
    ['Cor', 'Estampa'].flatMap((label) => {
      const value = this.product().measurements?.[label]?.trim();
      return value ? [{ label, value }] : [];
    }),
  );
  readonly pending = computed(() => this.cart.pending().has(this.product().id));
  readonly quantityInCart = computed(() => {
    const productId = this.product().id;
    return this.cart
      .cart()
      .items.reduce(
        (quantity, item) =>
          item.productId === productId ? quantity + item.quantity : quantity,
        0,
      );
  });
  readonly inCart = computed(() => this.quantityInCart() > 0);
  readonly canAdd = computed(() => {
    const product = this.product();
    return (
      product.active &&
      product.quantity > this.quantityInCart() &&
      !this.pending()
    );
  });

  add(): void {
    if (this.canAdd()) this.cart.add(this.product().id, 1);
  }
}
