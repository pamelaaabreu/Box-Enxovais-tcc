import type { Registration } from '../../shared/types/catalog/registration';
import { API_BASE_URL, apiEndpoint } from '../config/api.config';
import type {
  ProductUpdateRequest,
  ProductImageRecord,
  ProductCommerceUpdate,
} from '../../shared/types/products/admin-product';

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Product } from '../../shared/types/products/product';
import { forkJoin, Observable } from 'rxjs';
import { PaginationService } from './pagination.service';
import type { Page, PageOptions } from '../../shared/types/api/pagination';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly baseUrl = inject(API_BASE_URL).replace(/\/+$/, '');
  private readonly pagination = inject(PaginationService);
  private apiUrl = apiEndpoint(this.baseUrl, 'products');

  constructor(private http: HttpClient) {}

  catalogRegistrations(kind: 'categories' | 'brands') {
    return this.http.get<Registration[]>(
      apiEndpoint(this.baseUrl, 'admin/catalog/' + kind),
    );
  }
  updateCatalogRegistration(
    kind: 'categories' | 'brands',
    id: number,
    name: string,
  ) {
    return this.http.patch(
      apiEndpoint(this.baseUrl, `admin/catalog/${kind}/${id}`),
      { name },
    );
  }
  removeCatalogRegistration(kind: 'categories' | 'brands', id: number) {
    return this.http.delete(
      apiEndpoint(this.baseUrl, `admin/catalog/${kind}/${id}`),
    );
  }
  // Cadastra uma marca ou categoria.
  createCatalogRegistration(kind: 'categories' | 'brands', name: string) {
    return this.http.post<{ id: number; name: string }>(
      apiEndpoint(this.baseUrl, 'admin/catalog/') + kind,
      { name },
    );
  }

  getBrands(): Observable<{ id: number; name: string }[]> {
    return this.http.get<{ id: number; name: string }[]>(
      apiEndpoint(this.baseUrl, 'admin/products/brands'),
    );
  }

  getProductTypes(): Observable<{ id: number; name: string }[]> {
    return this.http.get<{ id: number; name: string }[]>(
      this.apiUrl + '/categories',
    );
  }

  // Recupera todos os produtos.
  getProducts(filters?: PageOptions['filters']): Observable<Product[]> {
    return this.pagination.getAll<Product>(this.apiUrl, filters);
  }

  // Recupera uma página de produtos.
  getProductsPage(options: PageOptions = {}): Observable<Page<Product>> {
    return this.pagination.getPage<Product>(this.apiUrl, options);
  }

  // Recupera todos os produtos administrativos.
  getAdminProducts(): Observable<Product[]> {
    return this.pagination.getAll<Product>(
      apiEndpoint(this.baseUrl, 'admin/products'),
    );
  }

  getAdminProductsPage(options: PageOptions = {}): Observable<Page<Product>> {
    return this.pagination.getPage<Product>(
      apiEndpoint(this.baseUrl, 'admin/products'),
      options,
    );
  }

  createProduct(product: Product): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.apiUrl, product);
  }

  getAdminProduct(id: number) {
    return this.http.get<Product>(`${this.baseUrl}/admin/products/${id}`);
  }

  updateProduct(id: number, request: ProductUpdateRequest) {
    return this.http.patch<Product>(
      `${this.baseUrl}/admin/products/${id}`,
      request,
    );
  }

  // O backend determina se deve excluir ou arquivar.
  removeProduct(id: number) {
    return this.http.delete<{ action: 'deleted' | 'archived' }>(
      `${this.baseUrl}/admin/products/${id}`,
    );
  }

  getProductImages(id: number) {
    return this.http.get<ProductImageRecord[]>(
      `${this.baseUrl}/admin/products/${id}/images`,
    );
  }

  // Envia a nova ordem e a ordem esperada das imagens.
  orderProductImages(
    id: number,
    variant_id: number | null,
    ids: number[],
    expected_ids: number[],
    primary_id: number,
  ) {
    return this.http.put<ProductImageRecord[]>(
      `${this.baseUrl}/admin/products/${id}/images`,
      { variant_id, ids, expected_ids, primary_id },
    );
  }

  removeProductImage(id: number, imageId: number) {
    return this.http.delete<ProductImageRecord[]>(
      `${this.baseUrl}/admin/products/${id}/images/${imageId}`,
    );
  }

  // Envia as variantes atuais e o estado anterior esperado.
  saveVariants(
    id: number,
    variants: NonNullable<Product['variants']>,
    expected: NonNullable<Product['variants']>,
    commerce?: ProductCommerceUpdate,
  ) {
    return this.http.put<{
      variants: NonNullable<Product['variants']>;
    }>(`${this.baseUrl}/admin/products/${id}/variants`, {
      variants,
      expected_variants: expected,
      ...(commerce ? { commerce } : {}),
    });
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  getRelatedProducts(id: number): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/${id}/related`);
  }

  // Consulta vários produtos em paralelo.
  getProductsByIds(ids: number[]): Observable<Product[]> {
    const requests = ids.map((id) => this.getProduct(id));

    return forkJoin(requests);
  }
}
