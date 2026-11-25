import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL, apiEndpoint } from '../../../../core/config/api.config';
import type {
  ReportData,
  ReportKind,
} from '../../../../shared/types/reports/report';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly url = apiEndpoint(inject(API_BASE_URL), 'admin/reports');

  load(kind: ReportKind, parameters: Record<string, string>) {
    return this.http.get<ReportData>(`${this.url}/${kind}`, {
      params: new HttpParams({ fromObject: parameters }),
    });
  }

  export(kind: ReportKind, parameters: Record<string, string>) {
    return this.http.get(`${this.url}/${kind}/export`, {
      params: new HttpParams({ fromObject: parameters }),
      responseType: 'blob',
    });
  }
}
