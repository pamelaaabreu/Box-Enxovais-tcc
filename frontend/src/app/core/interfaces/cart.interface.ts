export interface CartItem {
  id: number;
  productId: number;
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
