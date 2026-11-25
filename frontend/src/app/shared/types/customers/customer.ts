export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  createdAt: string | null;
  orders: number;
  validOrders: number;
  cancelledOrders: number;
  totalSpent: number;
  lastPurchase: string | null;
}
export interface CustomerPage {
  customers: Customer[];
  total: number;
  withOrders: number;
  withoutOrders: number;
}
export interface CustomerDetails extends Customer {
  addresses: {
    id: number;
    label: string;
    isDefault: boolean;
    recipient: string;
    zipCode: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
  }[];
}
