import { Injectable, inject } from '@angular/core';
import { Observable, of, map, catchError, throwError } from 'rxjs';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../shared/models';
import { CATEGORIES } from '../data/categories';
import { Category } from '../interfaces/category.interface';
import { CatalogProduct } from '../interfaces/product.interface';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly products = inject(ProductService);
  private slug(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  adapt(product: Product): CatalogProduct {
    const name = product.category_name ?? '';
    const category = CATEGORIES.find(c => c.slug === this.slug(name)) ?? {id: product.product_type_id ?? 0, name: name || 'Produtos', slug: this.slug(name)};
    return {...product, id: product.id!, slug: `${this.slug(product.name)}-${product.id}`, description: product.description ?? '', category,
      images: (product.image_paths ?? []).map((url, index) => ({id: index, url: /^https?:\/\//.test(url) ? url : `http://localhost:8080/${url.replace(/^\//, '')}`, alt: product.name, position: index})),
      variants: [], featured: false, active: product.status === 'active'};
  }
  getProductsByCategory(slug: string): Observable<CatalogProduct[]> {
    return this.products.getProducts().pipe(map(products => products.map(p => this.adapt(p)).filter(p => p.active && p.category.slug === slug)));
  }
  getProductBySlug(slug: string): Observable<CatalogProduct | null> {
    const id = Number(slug.match(/(?:^|-)(\d+)$/)?.[1]);
    if (!Number.isSafeInteger(id) || id <= 0) return of(null);
    return this.products.getProduct(id).pipe(map(p => p.status === 'active' ? this.adapt(p) : null), catchError(error => error.status === 404 ? of(null) : throwError(() => error)));
  }
  getCategoryBySlug(slug: string): Observable<Category | null> {
    return of(CATEGORIES.find(category => category.slug === slug) ?? null);
  }
}
