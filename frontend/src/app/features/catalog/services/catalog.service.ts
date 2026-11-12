import { PageOptions } from '../../../core/services/pagination.service';
import { Injectable, inject } from '@angular/core';
import { Observable, of, map, catchError, throwError } from 'rxjs';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../shared/models';
import { CAMA_GROUP, CATEGORIES } from '../data/categories';
import { Category } from '../interfaces/category.interface';
import { CatalogProduct } from '../interfaces/product.interface';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly products = inject(ProductService);
  private slug(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  private category(id: number, name: string): Category {
    const slug = this.slug(name);
    const shortcut = CATEGORIES.find(category => category.slug === slug);
    return {
      id,
      name,
      slug: shortcut?.name === name ? slug : (slug || 'categoria') + '--' + id,
      description: shortcut?.description,
    };
  }

  adapt(product: Product): CatalogProduct {
    const name = product.category_name?.trim() ?? '';
    const id = product.product_type_id ?? 0;
    const category = name ? this.category(id, name) : { id, name: 'Produtos', slug: '' };
    return {...product, id: product.id!, slug: `${this.slug(product.name)}-${product.id}`, description: product.description ?? '', category,
      images: [...new Set((product.image_paths ?? []).map(path => path.trim()).filter(Boolean))].map((url, index) => ({id: index, url: /^https?:\/\//.test(url) ? url : `http://localhost:8080/${url.replace(/^\//, '')}`, alt: product.name, position: index})),
      variants: [], featured: false, active: product.status === 'active'};
  }
  getCategoryPage(category: Category, options: PageOptions) {
    const filters = { ...options.filters };
    if (category.children) {
      if (!category.children.length) {
        return of({ items: [], pagination: {
          total: 0, hasMore: false, offset: options.offset ?? 0, limit: options.limit ?? 20,
        } });
      }
      filters['product_type_ids'] = category.children.map(child => child.id).join(',');
    } else if (category.slug !== 'todos') {
      filters['product_type_id'] = category.id;
    }
    return this.products.getProductsPage({ ...options, filters }).pipe(map(page => ({ ...page, items: page.items.map(item => this.adapt(item)) })));
  }

  getProductsByCategory(slug: string): Observable<CatalogProduct[]> {
    return this.products.getProducts().pipe(map(products => products.map(p => this.adapt(p)).filter(p => p.active && p.category.slug === slug)));
  }
  getRecommendations(product: CatalogProduct): Observable<CatalogProduct[]> {
    return this.products.getProductsPage({ limit: 12 }).pipe(map(page => page.items
      .filter(item => item.id !== product.id && item.status === 'active')
      .map(item => this.adapt(item))
      .sort((a, b) => Number(b.category.id === product.category.id) - Number(a.category.id === product.category.id) || a.id - b.id)
      .slice(0, 4)));
  }

  getProductBySlug(slug: string): Observable<CatalogProduct | null> {
    const id = Number(slug.match(/(?:^|-)(\d+)$/)?.[1]);
    if (!Number.isSafeInteger(id) || id <= 0) return of(null);
    return this.products.getProduct(id).pipe(map(p => p.status === 'active' ? this.adapt(p) : null), catchError(error => error.status === 404 ? of(null) : throwError(() => error)));
  }
  getCategoryBySlug(slug: string): Observable<Category | null> {
    if (slug === 'todos') return of({ id: 0, slug, name: 'Todos os produtos' });
    return this.products.getProductTypes().pipe(map(types => {
      const categories = types.filter(type => type.name.trim()).map(type => this.category(type.id, type.name.trim()));
      if (slug === CAMA_GROUP.slug) {
        const parent = CATEGORIES.find(category => category.slug === CAMA_GROUP.slug)!;
        const children = CAMA_GROUP.types.flatMap(name => categories.filter(category => category.name === name));
        return { ...parent, children };
      }
      const exact = categories.find(category => category.slug === slug);
      if (exact) return exact;
      const matches = categories.filter(category => this.slug(category.name) === slug);
      return matches.length === 1 ? matches[0] : null;
    }));
  }
}
