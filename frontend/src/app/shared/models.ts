export interface Product {
  id?: number;
  name: string;
  description?: string;
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
  promotional_price: number;
}

export interface AddToPromotionRequest {
  product_id?: number;
  promotion_name: string;
  promotional_price?: number;
}

export interface CreatePromotionRequest {
  name: string;
  status: string;
  start_date: string;
  end_date: string;
}

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface AlertOptions {
  duration?: number;
  showClose?: boolean;
  showProgress?: boolean;
}
