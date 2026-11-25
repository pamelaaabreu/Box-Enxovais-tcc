import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL, apiEndpoint } from '../../../../core/config/api.config';
import type { Dashboard } from '../../../../shared/types/dashboard/dashboard';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly url = apiEndpoint(inject(API_BASE_URL), 'admin/dashboard');

  load(parameters: Record<string, string>) {
    return this.http.get<Dashboard>(this.url, {
      params: new HttpParams({ fromObject: parameters }),
    });
  }
}
