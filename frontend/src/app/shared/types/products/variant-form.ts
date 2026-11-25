import type { FormControl, FormGroup } from '@angular/forms';
import type { Product } from './product';
export type ProductVariant = NonNullable<Product['variants']>[number];
export type VariantForm = FormGroup<{
  id: FormControl<number>;
  size: FormControl<string>;
  dimensions: FormControl<string>;
  price: FormControl<string>;
  stock: FormControl<number | null>;
}>;
