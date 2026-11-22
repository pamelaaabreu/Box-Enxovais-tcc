import { Injectable, inject } from '@angular/core';
import { AddToPromotionRequest, CreatePromotionRequest, Product, PromotionRecord } from '../../shared/models';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Page, PageOptions, PaginationService } from './pagination.service';

@Injectable({
  providedIn: 'root',
})
export class PromoService {
  private readonly pagination = inject(PaginationService);
  private apiUrl = 'http://localhost:8080/api/promotions';

  constructor(private http: HttpClient) {}

  listCampaigns(){return this.http.get<PromotionRecord[]>('http://localhost:8080/admin/promotions');}
  updateCampaign(id:number,request:CreatePromotionRequest){return this.http.put(`${'http://localhost:8080/admin/promotions'}/${id}`,request);}
  uploadCampaignImage(file:File){const form=new FormData();form.append('image',file);return this.http.post<{image_path:string}>('http://localhost:8080/admin/promotions/image',form);}
  getPromotionalProducts(promoName: string): Observable<Product[]> {
    return this.pagination.getAll<Product>(`${this.apiUrl}/${encodeURIComponent(promoName)}`);
  }
  getPromotionalProductsPage(promoName: string, options: PageOptions = {}): Observable<Page<Product>> {
    return this.pagination.getPage<Product>(`${this.apiUrl}/${encodeURIComponent(promoName)}`, options);
  }
  addProductToPromotion(request: AddToPromotionRequest): Observable<unknown> {
    const url = `${this.apiUrl}/add`;
    return this.http.post(url, request);
  }
  createPromotion(request: CreatePromotionRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/create`, request);
  }
}
