import type { Product } from '../products/product';
import { Category } from './category';
import { ProductImage } from './catalog-image';
import { ProductVariant } from './catalog-variant';

/** Storefront specialization of the existing API model; prices keep their original names. */
export interface CatalogProduct extends Omit<Product, 'variants'> {
  id: number;
  slug: string;
  description: string;
  category: Category;
  images: ProductImage[];
  variants: ProductVariant[];
  featured: boolean;
  active: boolean;
}
