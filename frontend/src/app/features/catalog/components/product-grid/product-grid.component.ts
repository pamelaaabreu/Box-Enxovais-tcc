import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CatalogProduct } from '../../interfaces/product.interface';
import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  selector: 'app-product-grid',
  standalone: true,
  imports: [ProductCardComponent],
  templateUrl: './product-grid.component.html',
  styleUrl: './product-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductGridComponent {
  readonly products = input<readonly CatalogProduct[]>([]);
  readonly loading = input(false);
  readonly skeletons = [1, 2, 3, 4];
}
