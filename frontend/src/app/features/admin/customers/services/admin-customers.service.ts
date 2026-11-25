import { API_BASE_URL, apiEndpoint } from '../../../../core/config/api.config';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

import type { AdminOrderPage } from '../../../../shared/types/orders/admin-order';

import type {
  CustomerPage,
  CustomerDetails,
} from '../../../../shared/types/customers/customer';

@Injectable({ providedIn: 'root' })
export class AdminCustomersService {
  private readonly apiBase = inject(API_BASE_URL).replace(/\/+$/, '');
  private readonly http = inject(HttpClient);
  private readonly url = apiEndpoint(this.apiBase, 'admin/customers');

  // Consulta os clientes com pesquisa e paginação.
  list(page: number, search: string) {
    return this.http
      .get<{ data: CustomerPage }>(this.url, {
        params: { page, search },
      })
      .pipe(map((r) => r.data));
  }

  // Consulta os detalhes de um cliente.
  detail(id: string) {
    return this.http
      .get<{ data: CustomerDetails }>(`${this.url}/${encodeURIComponent(id)}`)
      .pipe(map((r) => r.data));
  }

  // Consulta os pedidos pertencentes ao cliente.
  orders(id: string, page: number) {
    return this.http
      .get<{
        data: AdminOrderPage;
      }>(`${this.url}/${encodeURIComponent(id)}/orders`, { params: { page } })
      .pipe(map((r) => r.data));
  }
}
