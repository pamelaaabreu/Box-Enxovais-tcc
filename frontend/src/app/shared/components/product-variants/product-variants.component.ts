import { AdminStateComponent } from '../admin-state/admin-state.component';
import { Component, Input } from '@angular/core';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { maskPriceInput, money, parsePrice } from '../../forms/price-input';
import type { VariantForm } from '../../types/products/variant-form';
import { variantForm } from '../../forms/product-variants';
@Component({
  selector: 'app-product-variants',
  standalone: true,
  imports: [AdminStateComponent, ReactiveFormsModule, MatIconModule],
  templateUrl: './product-variants.component.html',
  styleUrl: './product-variants.component.scss',
})
export class ProductVariantsComponent {
  @Input() showSummary = true;
  @Input({ required: true }) variants!: FormArray<VariantForm>;
  get totalStock(): number {
    return this.variants.controls.reduce(
      (total, row) =>
        total +
        (row.controls.stock.valid ? (row.controls.stock.value ?? 0) : 0),
      0,
    );
  }
  get startingPrice(): string {
    const prices = this.variants.controls
      .map((row) => parsePrice(row.controls.price.value))
      .filter((price): price is number => price !== null);
    return prices.length ? 'R$ ' + money.format(Math.min(...prices)) : '';
  }
  add(): void {
    this.variants.push(variantForm());
    this.variants.markAsDirty();
  }
  remove(index: number): void {
    this.variants.removeAt(index);
    this.variants.markAsDirty();
  }
  mask(event: Event, row: VariantForm): void {
    maskPriceInput(event, row.controls.price);
  }
}
