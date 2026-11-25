import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL, apiEndpoint } from '../../../../core/config/api.config';
import type {
  ExperienceReview,
  ReviewModerationStatus,
} from '../../../../shared/types/experience-review.types';

@Injectable({ providedIn: 'root' })
export class ExperienceReviewService {
  private readonly http = inject(HttpClient);
  private readonly url = apiEndpoint(
    inject(API_BASE_URL),
    'admin/experience-reviews',
  );

  list() {
    return this.http.get<ExperienceReview[]>(this.url);
  }

  moderate(id: number, status: ReviewModerationStatus) {
    return this.http.patch(`${this.url}/${id}`, { status });
  }
}
