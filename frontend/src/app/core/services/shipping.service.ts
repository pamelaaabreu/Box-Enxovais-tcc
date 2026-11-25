import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL, apiEndpoint } from '../config/api.config';
import type { ShippingQuote } from '../../shared/types/checkout/checkout';
import type { ShippingRange } from '../../shared/types/shipping/shipping-range';
@Injectable({ providedIn: 'root' })
export class ShippingService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly ranges = apiEndpoint(
    this.base,
    'admin/catalog/shipping-ranges',
  );
  quote(cep: string) {
    return this.http.get<ShippingQuote>(
      apiEndpoint(this.base, 'shipping/quote'),
      { params: { cep } },
    );
  }
  list() {
    return this.http.get<ShippingRange[]>(this.ranges);
  }
  create(input: Omit<ShippingRange, 'id'>) {
    return this.http.post(this.ranges, input);
  }
  update(id: number, input: Omit<ShippingRange, 'id'>) {
    return this.http.patch(`${this.ranges}/${id}`, input);
  }
  remove(id: number) {
    return this.http.delete(`${this.ranges}/${id}`);
  }
}
