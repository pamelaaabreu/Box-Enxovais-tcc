import { Product } from '../../../shared/models';
import { Category } from './category.interface';
import { ProductImage } from './product-image.interface';
import { ProductVariant } from './product-variant.interface';

/** Storefront specialization of the existing API model; prices keep their original names. */
export interface CatalogProduct extends Product {
  id: number;
  slug: string;
  description: string;
  category: Category;
  images: ProductImage[];
  variants: ProductVariant[];
  featured: boolean;
  active: boolean;
}
