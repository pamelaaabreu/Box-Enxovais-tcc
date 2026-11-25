import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL, apiEndpoint } from '../config/api.config';
import type { Product } from '../../shared/types/products/product';
import type { HomeCampaign } from '../../shared/types/promotions/promotion';
import type { HomeCategory } from '../../shared/types/catalog/home-category';
@Injectable({ providedIn: 'root' })
export class HomeService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  featured() {
    return this.http.get<{ products: Product[] }>(
      apiEndpoint(this.base, 'home/featured'),
    );
  }
  campaign() {
    return this.http.get<HomeCampaign | null>(
      apiEndpoint(this.base, 'home/campaign'),
    );
  }
  categories() {
    return this.http.get<HomeCategory[]>(
      apiEndpoint(this.base, 'home/categories'),
    );
  }
}
