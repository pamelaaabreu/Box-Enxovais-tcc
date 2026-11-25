import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL, apiEndpoint } from '../config/api.config';
import type { PurchaseReviewInput } from '../../shared/types/experience-review.types';
@Injectable({ providedIn: 'root' })
export class PurchaseReviewService {
  private readonly http = inject(HttpClient);
  private readonly base = apiEndpoint(inject(API_BASE_URL), 'orders');
  read(id: number) {
    return this.http.get<{ status: string } | null>(
      `${this.base}/${id}/review`,
    );
  }
  save(id: number, input: PurchaseReviewInput) {
    return this.http.post(`${this.base}/${id}/review`, input);
  }
}
