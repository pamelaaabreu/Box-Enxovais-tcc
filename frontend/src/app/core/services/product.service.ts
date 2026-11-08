import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Product } from '../../shared/models';
import { forkJoin, Observable } from 'rxjs';
import { Page, PageOptions, PaginationService } from './pagination.service';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly pagination = inject(PaginationService);
  private apiUrl = 'http://localhost:8080/products';

  constructor(private http: HttpClient) {}

  getProducts(): Observable<Product[]> {
    return this.pagination.getAll<Product>(this.apiUrl);
  }

  getProductsPage(options: PageOptions = {}): Observable<Page<Product>> {
    return this.pagination.getPage<Product>(this.apiUrl, options);
  }

  getAdminProductsPage(options: PageOptions = {}): Observable<Page<Product>> {
    return this.pagination.getPage<Product>(
      'http://localhost:8080/admin/products',
      options,
    );
  }

  createProduct(product: Product): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.apiUrl, product);
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  getProductsByIds(ids: number[]): Observable<Product[]> {
    const requests = ids.map((id) => this.getProduct(id));
    return forkJoin(requests);
  }
}
