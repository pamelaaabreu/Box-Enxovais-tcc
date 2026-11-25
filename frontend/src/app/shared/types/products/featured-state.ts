import type { Product } from './product';
export type FeaturedState = {
  products: Product[];
  loading: boolean;
  error: string;
};
