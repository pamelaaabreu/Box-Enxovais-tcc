import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import type {
  ProductVariant,
  VariantForm,
} from '../types/products/variant-form';
import { money, parsePrice } from './price-input';
export function variantForm(value?: ProductVariant): VariantForm {
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
  return form.getRawValue().map((v) => ({
    id: v.id,
    size: v.size.trim(),
    dimensions: v.dimensions.trim(),
    price: parsePrice(v.price)!,
    stock: v.stock!,
  }));
}
