import { API_BASE_URL, apiEndpoint } from '../../../../core/config/api.config';
import { AssetUrlService } from '../../../../shared/services/asset-url.service';
import type {
  AdminOrderPage,
  AdminOrderDetails,
} from '../../../../shared/types/orders/admin-order';

import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';

// Registra a localização brasileira.
registerLocaleData(localePt, 'pt-BR');

// Traduz o status do pedido.
export const orderStatus = (status: string) =>
  status === 'cancelled'
    ? 'Cancelado'
    : status === 'simulated_approved'
      ? 'Aprovado'
      : status;

// Traduz a forma de pagamento.
export const orderPayment = (payment: string) =>
  ({ pix: 'Pix', card: 'Cartão', boleto: 'Boleto' })[payment] ?? payment;

@Injectable({ providedIn: 'root' })
export class AdminOrdersService {
  private readonly apiBase = inject(API_BASE_URL).replace(/\/+$/, '');
  private readonly assetUrls = inject(AssetUrlService);
  private readonly http = inject(HttpClient);
  private readonly url = apiEndpoint(this.apiBase, 'admin/orders');

  // Consulta os pedidos utilizando filtros.
  list(filters: Record<string, string | number>) {
    return this.http
      .get<{
        data: AdminOrderPage;
      }>(this.url, {
        params: new HttpParams({ fromObject: filters }),
      })
      .pipe(map((r) => r.data));
  }

  // Consulta os detalhes de um pedido.
  detail(id: string) {
    return this.http
      .get<{ data: AdminOrderDetails }>(`${this.url}/${encodeURIComponent(id)}`)
      .pipe(map((r) => r.data));
  }

  // Solicita o cancelamento administrativo.
  cancel(id: number) {
    return this.http.post(`${this.url}/${id}/cancel`, {
      reasonCode: 'other',
      reasonDetails: 'Cancelamento solicitado pela administração da loja.',
    });
  }

  // Constrói a URL da imagem.
  image(path: string) {
    return path ? this.assetUrls.resolve(path) : '';
  }
}
