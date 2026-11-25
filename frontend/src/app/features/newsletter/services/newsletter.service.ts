import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL, apiEndpoint } from '../../../core/config/api.config';
import type { NewsletterResponse } from '../../../shared/types/newsletter/newsletter.types';

@Injectable({ providedIn: 'root' })
export class NewsletterService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_BASE_URL);

  subscribe(email: string): Observable<NewsletterResponse> {
    return this.http.post<NewsletterResponse>(
      apiEndpoint(this.apiUrl, 'api/newsletter/subscribe'),
      { email: email.trim().toLowerCase() },
    );
  }
}
