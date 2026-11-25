export interface ShippingRange {
  id: number;
  name: string;
  startCep: string;
  endCep: string;
  priceCents: number;
  minDays: number;
  maxDays: number;
  active: boolean;
}
