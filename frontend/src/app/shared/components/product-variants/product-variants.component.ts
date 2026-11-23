import { AdminStateComponent } from '../admin-state/admin-state.component';
import { Component, Input } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Product } from '../../models';
import { maskPriceInput, money, parsePrice } from '../../forms/price-input';
export type ProductVariant = NonNullable<Product['variants']>[number];
export function variantForm(value?: ProductVariant) {
  return new FormGroup({
    id: new FormControl(value?.id ?? 0, { nonNullable: true }),
    size: new FormControl(value?.size ?? '', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(60),
      ],
    }),
    dimensions: new FormControl(value?.dimensions ?? '', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(500),
      ],
    }),
    price: new FormControl(value ? money.format(value.price) : '', {
      nonNullable: true,
      validators: [
        Validators.required,
        (c) => (parsePrice(c.value) === null ? { money: true } : null),
      ],
    }),
    stock: new FormControl<number | null>(value?.stock ?? null, [
      Validators.required,
      (c) =>
        Number.isInteger(c.value) && c.value >= 0 && c.value <= 2147483647
          ? null
          : { stock: true },
    ]),
  });
}
export type VariantForm = ReturnType<typeof variantForm>;
export function variantsArray() {
  return new FormArray<VariantForm>([], {
    validators: (control) => {
      const rows = control.getRawValue() as Array<{
        size: string;
        stock: number | null;
      }>;
      const names = rows.map((v) => v.size.trim().toLocaleLowerCase('pt-BR'));
      if (new Set(names).size !== names.length) return { duplicateSizes: true };
      return rows.reduce((sum, v) => sum + (v.stock ?? 0), 0) > 2147483647
        ? { totalStock: true }
        : null;
    },
  });
}
export function variantPayload(form: FormArray<VariantForm>): ProductVariant[] {
  return form
    .getRawValue()
    .map((v) => ({
      id: v.id,
      size: v.size.trim(),
      dimensions: v.dimensions.trim(),
      price: parsePrice(v.price)!,
      stock: v.stock!,
    }));
}
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
