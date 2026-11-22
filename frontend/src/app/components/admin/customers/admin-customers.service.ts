import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { AdminOrderPage } from '../orders/admin-orders.service';
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
@Injectable({ providedIn: 'root' })
export class AdminCustomersService {
  private readonly http = inject(HttpClient);
  private readonly url = 'http://localhost:8080/admin/customers';
  list(page: number, search: string) {
    return this.http
      .get<{ data: CustomerPage }>(this.url, { params: { page, search } })
      .pipe(map((r) => r.data));
  }
  detail(id: string) {
    return this.http
      .get<{ data: CustomerDetails }>(`${this.url}/${encodeURIComponent(id)}`)
      .pipe(map((r) => r.data));
  }
  orders(id: string, page: number) {
    return this.http
      .get<{
        data: AdminOrderPage;
      }>(`${this.url}/${encodeURIComponent(id)}/orders`, { params: { page } })
      .pipe(map((r) => r.data));
  }
}
