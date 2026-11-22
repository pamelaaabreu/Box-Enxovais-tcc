import type { PaymentPlan } from '../checkout/checkout';

export interface AdminOrder { id:number; customerId:number; customer:string; createdAt:string; total:number; status:string; paymentMethod:string; }
export interface AdminOrderPage {orders:AdminOrder[];total:number;approved:number;cancelled:number;}
export interface AdminOrderDetails extends AdminOrder, PaymentPlan {
 items:{id:number;productId:number;name:string;quantity:number;unitPrice:number;subtotal:number;image:string;sku?:string;variantId?:number}[];
 address:{recipient:string;zipCode:string;street:string;number:string;complement:string;neighborhood:string;city:string;state:string};
 subtotal:number;shipping:number|null;discount:number|null;shippingMinDays?:number|null;shippingMaxDays?:number|null;shippingMethod?:string|null;productsSubtotal?:number|null;canCancel:boolean;
 events:{kind:string;at:string;reason?:string}[];
}
