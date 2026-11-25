import { AuthService } from './auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL, apiEndpoint } from '../config/api.config';
import type { ApiResponse } from '../../shared/types/api/response';
import type {
  CheckoutRequest,
  ConfirmedOrder,
} from '../../shared/types/checkout/checkout';
@Injectable({ providedIn: 'root' })
export class CheckoutService {
  readonly draft: {
    addressId?: number;
    phone: string;
    address?: Record<string, string>;
  } = { phone: '' };
  constructor() {
    inject(AuthService)
      .userChanged.pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.draft.phone = '';
        this.draft.addressId = undefined;
        this.draft.address = undefined;
      });
  }
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  confirm(input: CheckoutRequest) {
    return this.http.post<ApiResponse<ConfirmedOrder> | null>(
      apiEndpoint(this.base, 'checkout'),
      input,
    );
  }
  success(id: string) {
    return this.http.get<ApiResponse<ConfirmedOrder>>(
      apiEndpoint(this.base, `checkout/success/${encodeURIComponent(id)}`),
    );
  }
}
