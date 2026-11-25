import type { Category } from './category';
import type { CatalogProduct } from './catalog-product';
export interface CategoryData {
  category: Category | null;
  products: CatalogProduct[];
  total: number;
  hasMore: boolean;
}
