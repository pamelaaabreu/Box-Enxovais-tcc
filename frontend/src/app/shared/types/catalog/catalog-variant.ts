import { ProductImage } from './catalog-image';

export interface ProductVariant {
  id: number;
  sku?: string;
  price?: number;
  dimensions?: string;
  images?: ProductImage[];
  includedItems?: string[];
  simulated?: boolean;
  color?: string;
  size?: string;
  stock: number;
}
