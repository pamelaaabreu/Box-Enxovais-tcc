import { CurrencyPipe, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

registerLocaleData(localePt, 'pt-BR');

@Component({
  selector: 'app-product-price',
  host: { '[class.emphasized]': 'emphasized()' },
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './product-price.component.html',
  styleUrl: './product-price.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPriceComponent {
  readonly emphasized = input(false);
  readonly price = input.required<number>();
}
