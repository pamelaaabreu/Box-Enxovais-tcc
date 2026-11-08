import { Component, inject } from '@angular/core';
import { CurrencyPipe, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { CatalogLayoutComponent } from '../catalog/components/catalog-layout/catalog-layout.component';
registerLocaleData(localePt);
@Component({
  selector: 'app-cart', standalone: true,
  imports: [CurrencyPipe, RouterLink, CatalogLayoutComponent],
  templateUrl: './cart.component.html', styleUrl: './cart.component.css',
})
export class CartComponent {
  readonly cart = inject(CartService);
  constructor() { this.cart.load(); }
  imageUrl(path: string): string {
    return /^https?:\/\//.test(path) ? path : `http://localhost:8080/${path.replace(/^\//, '')}`;
  }
  hideBrokenImage(event: Event): void { (event.target as HTMLImageElement).hidden = true; }
}
