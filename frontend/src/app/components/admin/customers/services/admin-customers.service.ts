import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { AdminOrderPage } from '../../orders/services/admin-orders.service';
import type { CustomerPage, CustomerDetails } from '../models/customer.models';
export type { Customer, CustomerPage, CustomerDetails } from '../models/customer.models';
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
