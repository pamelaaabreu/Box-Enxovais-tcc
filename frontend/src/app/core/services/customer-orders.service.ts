import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL, apiEndpoint } from '../config/api.config';
import type {
  CustomerOrderPage,
  CustomerOrderDetails,
  CancellationInput,
} from '../../shared/types/orders/customer-order';
@Injectable({ providedIn: 'root' })
export class CustomerOrdersService {
  private readonly http = inject(HttpClient);
  private readonly base = apiEndpoint(inject(API_BASE_URL), 'orders');
  read(id: string | null, query: string) {
    return this.http.get<{ data: CustomerOrderPage | CustomerOrderDetails }>(
      id ? `${this.base}/${encodeURIComponent(id)}` : `${this.base}?${query}`,
    );
  }
  cancel(id: number, input: CancellationInput) {
    return this.http.post<{ data: CustomerOrderDetails }>(
      `${this.base}/${id}/cancel`,
      input,
    );
  }
}
