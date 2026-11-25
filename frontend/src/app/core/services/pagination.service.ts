import {
  HttpClient,
  HttpParams,
  HttpUrlEncodingCodec,
} from '@angular/common/http';

import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce, throwError } from 'rxjs';

import type { Page, PageOptions } from '../../shared/types/api/pagination';

@Injectable({ providedIn: 'root' })
export class PaginationService {
  private readonly http = inject(HttpClient);

  getPage<T>(url: string, options: PageOptions = {}): Observable<Page<T>> {
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 20;
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return throwError(() => new Error('Parâmetros de paginação inválidos.'));
    }
    // Cria um codificador de parâmetros HTTP.
    const encoder = new HttpUrlEncodingCodec();

    let params = new HttpParams({
      encoder: {
        encodeKey: (key) => encoder.encodeKey(key),

        // Codifica também o ponto e vírgula.
        encodeValue: (value) => encoder.encodeValue(value).replace(/;/g, '%3B'),

        decodeKey: (key) => encoder.decodeKey(key),

        decodeValue: (value) => encoder.decodeValue(value),
      },
    })
      .set('offset', options.offset ?? 0)
      .set('limit', options.limit ?? 20);

    // Adiciona os filtros recebidos.
    for (const [field, value] of Object.entries(options.filters ?? {})) {
      // Impede que os filtros sobrescrevam a paginação.
      if (field !== 'offset' && field !== 'limit') {
        params = params.set(field, value);
      }
    }

    // Recebe uma resposta cujo formato ainda não foi validado.
    return this.http.get<unknown>(url, { params }).pipe(
      // Normaliza a estrutura retornada pelo backend.
      map((response) => this.normalizePage<T>(response, options)),
    );
  }

  private normalizePage<T>(response: unknown, options: PageOptions): Page<T> {
    // Compatibilidade com versões anteriores da API
    // que retornavam arrays completos ou null.
    if (response === null || Array.isArray(response)) {
      const items: T[] = response ?? [];

      const offset = options.offset ?? 0;
      const limit = options.limit ?? 20;

      // Realiza a paginação localmente.
      return {
        items: items.slice(offset, offset + limit),

        pagination: {
          offset,
          limit,
          total: items.length,
          hasMore: offset + limit < items.length,
        },
      };
    }

    // Valida a estrutura paginada retornada pelo backend.
    if (typeof response === 'object' && response !== null) {
      const page = response as Partial<Page<T>>;
      const meta = page.pagination;

      if (
        Array.isArray(page.items) &&
        meta &&
        Number.isSafeInteger(meta.offset) &&
        meta.offset >= 0 &&
        Number.isSafeInteger(meta.limit) &&
        meta.limit > 0 &&
        meta.limit <= 100 &&
        meta.offset === (options.offset ?? 0) &&
        page.items.length <= meta.limit &&
        Number.isSafeInteger(meta.total) &&
        meta.total >= 0 &&
        typeof meta.hasMore === 'boolean' &&
        (!meta.hasMore ||
          (page.items.length > 0 &&
            Number.isSafeInteger(meta.offset + page.items.length) &&
            meta.offset + page.items.length < meta.total))
      ) {
        return page as Page<T>;
      }
    }

    // Impede o consumo de uma resposta inválida.
    throw new Error(
      'Resposta inválida da API: dados de paginação ausentes ou incorretos.',
    );
  }

  // Recupera todos os registros através de várias
  // requisições paginadas.
  getAll<T>(
    url: string,
    filters: PageOptions['filters'] = {},
  ): Observable<T[]> {
    return this.getPage<T>(url, {
      limit: 100,
      filters,
    }).pipe(
      // Solicita a próxima página enquanto existirem registros.
      expand((page) =>
        page.pagination.hasMore && page.items.length > 0
          ? this.getPage<T>(url, {
              offset: page.pagination.offset + page.items.length,

              limit: page.pagination.limit,
              filters,
            })
          : EMPTY,
      ),

      // Acumula os registros de todas as páginas.
      reduce((items, page) => items.concat(page.items), [] as T[]),
    );
  }
}
