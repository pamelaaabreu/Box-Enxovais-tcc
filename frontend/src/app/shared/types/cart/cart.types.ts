export interface CartItem {
  id: number;
  productId: number;
  variantId?: number;
  name: string;
  image: string;
  quantity: number;
  stock: number;
  available: boolean;
  unitPrice: number;
  subtotal: number;
}
export interface Cart {
  items: CartItem[];
  totalItems: number;
  total: number;
}

// Informações da compra imediata.
export type QuickPurchase = {
  productId: number;
  quantity: number;
  variantId?: number;
  reuseCartItem: boolean;
};
