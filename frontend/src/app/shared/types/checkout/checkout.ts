export interface PaymentPlan { installments?: number | null; installmentAmounts?: readonly number[] | null; }
export interface ConfirmedOrder extends PaymentPlan { id: number; total: number; status: string; }
export interface ShippingQuote { priceCents: number; minDays: number; maxDays: number; }
