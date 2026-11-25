import type { Product } from './product';

export interface ProductCommerceUpdate {
  price: number;
  quantity: number;
  expected_price: number;
  expected_quantity: number;
}
export interface ProductUpdateRequest {
  name: string;
  description: string;
  care_instructions: string;
  brand_id: number | null;
  product_type_id: number;
  status: string;
  measurements: Record<string, string>;
  variants: NonNullable<Product['variants']>;
  expected_variants: NonNullable<Product['variants']>;
  expected_updated_at: string;
  commerce?: ProductCommerceUpdate;
}
export interface ProductImageRecord {
  id: number;
  path: string;
  variant_id: number | null;
  is_primary: boolean;
  position: number;
}
