import type { Product } from '../products/product';

export interface AddToPromotionRequest {
  product_id?: number;
  promotion_name: string;
  promotional_price?: number;
}

export interface PromotionParticipant {
  product_id: number;
  promotional_price?: number;
}
export interface PromotionRecord extends CreatePromotionRequest {
  id: number;
  updated_at?: string;
  created_at?: string;
}
export interface HomeCampaign {
  id: number;
  name: string;
  description: string;
  imagePath: string;
  startDate: string;
  endDate: string;
  products: Product[];
}

export interface CreatePromotionRequest {
  products?: PromotionParticipant[];
  description?: string;
  image_path?: string;
  home_featured?: boolean;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
}

