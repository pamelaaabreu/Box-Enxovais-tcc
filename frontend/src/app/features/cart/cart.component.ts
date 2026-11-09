import { Component, inject } from '@angular/core';
import { CurrencyPipe, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { CatalogLayoutComponent } from '../catalog/components/catalog-layout/catalog-layout.component';
import { MatIconModule } from '@angular/material/icon';

registerLocaleData(localePt);

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, CatalogLayoutComponent, MatIconModule],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
})
export class CartComponent {
  readonly cart = inject(CartService);

  constructor() {
    this.cart.load();
  }

  canCheckout(): boolean {
    return (
      !this.cart.busy() &&
      !this.cart.loading() &&
      !this.cart.error() &&
      this.cart.cart().items.length > 0 &&
      this.cart.cart().items.every((item) => item.available)
    );
  }

  imageUrl(path: string): string {
    return /^https?:\/\//.test(path)
      ? path
      : `http://localhost:8080/${path.replace(/^\//, '')}`;
  }

  hideBrokenImage(event: Event): void {
    (event.target as HTMLImageElement).hidden = true;
  }
}
