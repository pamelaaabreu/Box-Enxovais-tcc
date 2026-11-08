import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';

export interface Page<T> {
  items: T[];
  pagination: { offset: number; limit: number; total: number; hasMore: boolean };
}
export interface PageOptions {
  offset?: number;
  limit?: number;
  filters?: Record<string, string | number>;
}

@Injectable({ providedIn: 'root' })
export class PaginationService {
  private readonly http = inject(HttpClient);

  getPage<T>(url: string, options: PageOptions = {}): Observable<Page<T>> {
    let params = new HttpParams().set('offset', options.offset ?? 0).set('limit', options.limit ?? 20);
    for (const [field, value] of Object.entries(options.filters ?? {})) {
      if (field !== 'offset' && field !== 'limit') params = params.set(field, value);
    }
    return this.http.get<unknown>(url, { params }).pipe(
      map(response => this.normalizePage<T>(response, options)),
    );
  }

  private normalizePage<T>(response: unknown, options: PageOptions): Page<T> {
    // Older API instances return the complete array (or null for no promotions).
    if (response === null || Array.isArray(response)) {
      const items: T[] = response ?? [];
      const offset = options.offset ?? 0;
      const limit = options.limit ?? 20;
      return {
        items: items.slice(offset, offset + limit),
        pagination: { offset, limit, total: items.length, hasMore: offset + limit < items.length },
      };
    }
    if (typeof response === 'object' && response !== null) {
      const page = response as Partial<Page<T>>;
      const meta = page.pagination;
      if (Array.isArray(page.items) && meta &&
          Number.isSafeInteger(meta.offset) && meta.offset >= 0 &&
          Number.isSafeInteger(meta.limit) && meta.limit > 0 &&
          Number.isSafeInteger(meta.total) && meta.total >= 0 &&
          typeof meta.hasMore === 'boolean') {
        return page as Page<T>;
      }
    }
    throw new Error('Resposta inválida da API: dados de paginação ausentes ou incorretos.');
  }

  // Compatibility for existing views that display/filter the complete collection.
  // New paginated views should use getPage instead.
  getAll<T>(url: string, filters: PageOptions['filters'] = {}): Observable<T[]> {
    return this.getPage<T>(url, { limit: 100, filters }).pipe(
      expand(page => page.pagination.hasMore && page.items.length > 0
        ? this.getPage<T>(url, {
            offset: page.pagination.offset + page.items.length,
            limit: page.pagination.limit,
            filters,
          })
        : EMPTY),
      reduce((items, page) => items.concat(page.items), [] as T[]),
    );
  }
}
