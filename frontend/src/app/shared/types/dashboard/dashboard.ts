export interface DashboardPoint {
  bucket: string;
  orders: number;
  approved: number;
  cancelled: number;
  revenueCents: number;
  customers: number;
}
export interface Dashboard {
  orders: number;
  approvedOrders: number;
  cancelledOrders: number;
  revenueCents: number;
  shippingCents?: number;
  averageTicketCents: number;
  products: number;
  activeProducts: number;
  lowStock: number;
  outOfStock: number;
  customers: number;
  newCustomers: number;
  customersWithOrders: number;
  period: {
    preset: string;
    from: string;
    until: string;
    group: 'day' | 'month';
    timezone: string;
  };
  series: DashboardPoint[];
  months: { month: string; total: number; cancelled: number }[];
  categories: { name: string; units: number }[];
  topProducts: {
    productId: number;
    name: string;
    units: number;
    revenueCents: number;
    archived: boolean;
  }[];
  stock: {
    productId: number;
    variantId: number;
    name: string;
    size: string;
    quantity: number;
    totalQuantity: number;
  }[];
  recentOrders: {
    id: number;
    customer: string;
    createdAt: string;
    totalCents: number;
    status: string;
  }[];
}
