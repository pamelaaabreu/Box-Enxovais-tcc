import { FavoriteButtonComponent } from '../../shared/favorite-button/favorite-button.component';
import { ProductMediaComponent } from '../catalog/components/product-media/product-media.component';
import { CartService } from '../../core/services/cart.service';
import { Component, OnInit, Input, inject } from '@angular/core';
import { Product } from '../../shared/models';
import { PromoService } from '../../core/services/promo.service';
import { CurrencyPipe, DecimalPipe, CommonModule} from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-promo-grid',
  standalone: true,
  imports: [FavoriteButtonComponent, ProductMediaComponent, CurrencyPipe, RouterLink, DecimalPipe, CommonModule],
  templateUrl: './promo-grid.component.html',
  styleUrl: './promo-grid.component.css',
})
export class PromoGridComponent implements OnInit {
  readonly cart = inject(CartService);
  promotionalProducts: Product[] = [];
  cartItem(product: Product) {
    return this.cart.cart().items.find(item => item.productId === product.id);
  }

  available(product: Product): boolean {
    return Number.isSafeInteger(product.id) && product.id! > 0 &&
      product.status === 'active' && product.quantity > 0;
  }

  pending(product: Product): boolean {
    const item = this.cartItem(product);
    const keys = this.cart.pending();
    return keys.has(product.id!) || keys.has(-1) || keys.has(0) || !!item && keys.has(-item.id - 1);
  }

  canIncrease(product: Product): boolean {
    const item = this.cartItem(product);
    return this.available(product) && !this.pending(product) &&
      (!item || item.available && item.quantity < Math.min(item.stock, 1000000));
  }

  addToCart(product: Product): void {
    if (!this.canIncrease(product) || this.cartItem(product)) return;
    this.cart.add(product.id!, 1);
  }

  changeQuantity(product: Product, direction: -1 | 1): void {
    const item = this.cartItem(product);
    if (!item || this.pending(product) || direction === 1 && !this.canIncrease(product)) return;
    if (direction === -1 && item.quantity === 1) this.cart.remove(item.id);
    else this.cart.update(item.id, item.quantity + direction);
  }

  hasDiscount(product: Product): boolean {
    return Number.isFinite(product.promotional_price) && product.promotional_price >= 0 &&
      product.price > 0 && product.promotional_price < product.price;
  }
  @Input() promoName?: string;

  constructor(private promoService: PromoService) {}

  ngOnInit(): void {
    if (this.promoName) {
      this.promoService.getPromotionalProducts(this.promoName).subscribe({
        next: (data) => {
          this.promotionalProducts = data;    
        },
        error: (err) => {
          console.error('Erro ao buscar promoções', err);
        },
      });
    }
  }
}