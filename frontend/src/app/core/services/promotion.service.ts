import { API_BASE_URL, apiEndpoint } from '../config/api.config';
import { Injectable, inject } from '@angular/core';

import type {
  AddToPromotionRequest,
  CreatePromotionRequest,
  PromotionRecord,
} from '../../shared/types/promotions/promotion';
import type { Product } from '../../shared/types/products/product';

import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaginationService } from './pagination.service';
import type { Page, PageOptions } from '../../shared/types/api/pagination';

@Injectable({
  providedIn: 'root',
})
export class PromotionService {
  private readonly baseUrl = inject(API_BASE_URL).replace(/\/+$/, '');
  private readonly pagination = inject(PaginationService);

  private apiUrl = apiEndpoint(this.baseUrl, 'api/promotions');

  constructor(private http: HttpClient) {}

  listCampaigns() {
    return this.http.get<PromotionRecord[]>(
      apiEndpoint(this.baseUrl, 'admin/promotions'),
    );
  }

  updateCampaign(id: number, request: CreatePromotionRequest) {
    return this.http.put(
      `${apiEndpoint(this.baseUrl, 'admin/promotions')}/${id}`,
      request,
    );
  }

  // Envia a imagem utilizando multipart/form-data.
  uploadCampaignImage(file: File) {
    const form = new FormData();

    form.append('image', file);

    return this.http.post<{ image_path: string }>(
      apiEndpoint(this.baseUrl, 'admin/promotions/image'),
      form,
    );
  }

  getPromotionalProducts(promoName: string): Observable<Product[]> {
    return this.pagination.getAll<Product>(
      `${this.apiUrl}/${encodeURIComponent(promoName)}`,
    );
  }

  getPromotionalProductsPage(
    promoName: string,
    options: PageOptions = {},
  ): Observable<Page<Product>> {
    return this.pagination.getPage<Product>(
      `${this.apiUrl}/${encodeURIComponent(promoName)}`,
      options,
    );
  }

  addProductToPromotion(request: AddToPromotionRequest): Observable<unknown> {
    const url = `${this.apiUrl}/add`;

    return this.http.post(url, request);
  }

  createPromotion(request: CreatePromotionRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/create`, request);
  }
}
