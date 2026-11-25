import { inject, Injectable } from '@angular/core';
import { API_BASE_URL, apiEndpoint } from '../../core/config/api.config';
@Injectable({ providedIn: 'root' })
export class AssetUrlService {
  private readonly base = inject(API_BASE_URL);
  resolve(path: string | null | undefined): string {
    return path
      ? /^https?:\/\//.test(path)
        ? path
        : apiEndpoint(this.base, path)
      : '';
  }
}
