import { FavoriteButtonComponent } from '../../../../shared/favorite-button/favorite-button.component';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogProduct } from '../../interfaces/product.interface';
import { ProductMediaComponent } from '../product-media/product-media.component';
import { ProductPriceComponent } from '../product-price/product-price.component';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [FavoriteButtonComponent, RouterLink, ProductMediaComponent, ProductPriceComponent],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent {
  readonly product = input.required<CatalogProduct>();
}
