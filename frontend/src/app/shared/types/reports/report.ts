interface DashboardPeriod {
  preset: string;
  from: string;
  until: string;
  group: string;
  timezone: string;
}
export type ReportKind = 'sales' | 'products' | 'customers' | 'stock';
export interface ReportRow {
  id: number;
  name: string;
  sku: string;
  category: string;
  brand: string;
  variant: string;
  email: string;
  createdAt: string;
  lastPurchase: string;
  payment: string;
  status: string;
  units: number;
  orders: number;
  revenueCents: number;
  shippingCents?: number | null;
  discountCents?: number | null;
  productsSubtotalCents?: number | null;
  share: number;
  archived: boolean;
}
export interface ReportData {
  rows: ReportRow[];
  total: number;
  stats: Record<string, number>;
  page: number;
  pageSize: number;
  period: DashboardPeriod;
}
