import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL, apiEndpoint } from '../config/api.config';
import type {
  ExperienceReview,
  PurchaseReviewInput,
} from '../../shared/types/experience-review.types';
@Injectable({ providedIn: 'root' })
export class PurchaseReviewService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_BASE_URL);
  private readonly base = apiEndpoint(this.api, 'orders');
  mine() {
    return this.http.get<ExperienceReview[]>(
      apiEndpoint(this.api, 'me/experience-reviews'),
    );
  }
  read(id: number) {
    return this.http.get<ExperienceReview | null>(`${this.base}/${id}/review`);
  }
  save(id: number, input: PurchaseReviewInput, editing = false) {
    if (editing) return this.http.patch(`${this.base}/${id}/review`, input);
    return this.http.post(`${this.base}/${id}/review`, input);
  }
}
