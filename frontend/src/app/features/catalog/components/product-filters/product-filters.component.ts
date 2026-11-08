import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-product-filters',
  standalone: true,
  templateUrl: './product-filters.component.html',
  styleUrl: './product-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFiltersComponent {}
