import { Component, Input, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HomeService } from '../../core/services/home.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import type { Product } from '../../shared/types/products/product';
import { CatalogService } from '../catalog/services/catalog.service';
import { ProductCardComponent } from '../catalog/components/product-card/product-card.component';
@Component({
  selector: 'app-promo-grid',
  standalone: true,
  imports: [DatePipe, ProductCardComponent],
  templateUrl: './promo-grid.component.html',
  styleUrl: './promo-grid.component.scss',
})
export class PromoGridComponent {
  @Input() promoName?: string;
  readonly catalog = inject(CatalogService);
  readonly campaign = toSignal(
    inject(HomeService)
      .campaign()
      .pipe(catchError(() => of(null))),
    { initialValue: null },
  );
}
