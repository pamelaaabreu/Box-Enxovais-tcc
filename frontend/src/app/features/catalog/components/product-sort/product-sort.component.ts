import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-product-sort',
  standalone: true,
  templateUrl: './product-sort.component.html',
  styleUrl: './product-sort.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductSortComponent {}
