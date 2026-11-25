import type { PaymentPlan } from '../checkout/checkout';
export interface CustomerOrder extends PaymentPlan {
  shipping?: number | null;
  shippingMinDays?: number | null;
  shippingMaxDays?: number | null;
  shippingMethod?: string | null;
  productsSubtotal?: number | null;
  discount?: number | null;
  id: number;
  createdAt: string;
  total: number;
  status: string;
  items: {
    id: number;
    name: string;
    quantity: number;
    image: string;
    productId?: number;
    unitPrice: number;
    subtotal: number;
  }[];
}

export interface CustomerOrderDetails extends CustomerOrder {
  canCancel: boolean;
  cancellation?: { reasonCode: string; reasonDetails?: string };
  address: {
    recipient: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  paymentMethod: string;
}

export interface CustomerOrderPage {
  total?: number;
  orders: CustomerOrder[];
  hasMore: boolean;
}

export interface CancellationInput {
  reasonCode: string;
  reasonDetails: string;
}
