export interface Product {
  sku?: string;
  updated_at?: string;
  created_at?: string;
  id?: number;
  name: string;
  description?: string;
  purchase_summary?: string;
  brand_name?: string;
  care_instructions?: string;
  measurements: { [key: string]: string };
  price: number;
  quantity: number;
  stock?: number;
  brand_id?: number;
  product_type_id?: number;
  category_name?: string;
  status: string;
  image_paths?: string[];
  variants?: Array<{
    id: number;
    size: string;
    price: number;
    stock: number;
    dimensions?: string;
    image_paths?: string[];
    included_items?: string[];
    simulated?: boolean;
  }>;
  promotional_price: number;
  promotion_active?: boolean;
}
