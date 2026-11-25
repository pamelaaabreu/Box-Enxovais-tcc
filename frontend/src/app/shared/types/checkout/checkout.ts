import type { ShippingAddress } from '../account/account.types';
export interface PaymentPlan {
  installments?: number | null;
  installmentAmounts?: readonly number[] | null;
}
export interface ConfirmedOrder extends PaymentPlan {
  id: number;
  total: number;
  status: string;
}
export interface ShippingQuote {
  priceCents: number;
  minDays: number;
  maxDays: number;
}

export interface CheckoutRequest {
  requestKey: string;
  addressId?: number | null;
  address?: ShippingAddress;
  saveAddress?: boolean;
  contactPhone?: string;
  paymentMethod: string;
  expectedTotalCents: number;
  installments: number;
}
