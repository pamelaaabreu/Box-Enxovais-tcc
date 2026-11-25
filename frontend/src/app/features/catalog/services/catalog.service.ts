import { AssetUrlService } from '../../../shared/services/asset-url.service';
import { CARD_IMAGE_VARIANTS } from '../data/card-image-variants';
import type { PageOptions } from '../../../shared/types/api/pagination';
import { Injectable, inject } from '@angular/core';
import { Observable, of, map, catchError, throwError } from 'rxjs';
import { ProductService } from '../../../core/services/product.service';
import type { Product } from '../../../shared/types/products/product';
import { CAMA_GROUP, CATEGORIES } from '../data/categories';
import { Category } from '../../../shared/types/catalog/category';
import { CatalogProduct } from '../../../shared/types/catalog/catalog-product';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly assetUrls = inject(AssetUrlService);
  private readonly products = inject(ProductService);

  // Converte um nome em um slug.
  private slug(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Converte os dados da categoria.
  private category(id: number, name: string): Category {
    const slug = this.slug(name);

    const shortcut = CATEGORIES.find((category) => category.slug === slug);

    return {
      id,
      name,

      slug: shortcut?.name === name ? slug : (slug || 'categoria') + '--' + id,

      description: shortcut?.description,
    };
  }

  // Adapta o produto recebido da API.
  adapt(product: Product): CatalogProduct {
    const name = product.category_name?.trim() ?? '';
    const id = product.product_type_id ?? 0;

    const category = name
      ? this.category(id, name)
      : { id, name: 'Produtos', slug: '' };

    // Normaliza as imagens do produto ou da variante.
    const imagesOf = (paths: string[] = [], variant = '') =>
      [...new Set(paths.map((path) => path.trim()).filter(Boolean))].map(
        (path, index) => {
          const url = /^https?:\/\//.test(path)
            ? path
            : this.assetUrls.resolve(path);

          const optimizedCover = url.endsWith(
            '/cama-detalhe-023-2-capa-1448.jpg',
          );

          return {
            id: index,

            ...(name === 'Decoração' ? { fit: 'contain' as const } : {}),

            url,

            cardUrl: CARD_IMAGE_VARIANTS[url.slice(url.lastIndexOf('/') + 1)]
              ? this.assetUrls.resolve(
                  'uploads/' +
                    CARD_IMAGE_VARIANTS[url.slice(url.lastIndexOf('/') + 1)],
                )
              : undefined,

            srcset: optimizedCover
              ? `${url.replace('-1448.jpg', '-640.jpg')} 640w, ${url} 1448w`
              : undefined,

            alt: variant ? `${product.name} — ${variant}` : product.name,

            position: index,
          };
        },
      );

    return {
      ...product,
      measurements: product.measurements ?? {},

      name: product.name.replace(/\s+—\s+/g, ' '),

      id: product.id!,

      slug:
        product.measurements?.['catalog_slug'] ||
        `${this.slug(product.name)}-${product.id}`,

      description: product.description ?? '',

      category,

      images: imagesOf(product.image_paths),

      variants: (product.variants ?? []).map((variant) => ({
        id: variant.id,
        size: variant.size,
        price: variant.price,
        stock: variant.stock,
        dimensions: variant.dimensions,
        images: imagesOf(variant.image_paths, variant.size),
        includedItems: variant.included_items,
        simulated: variant.simulated,
      })),

      featured: false,
      active: product.status === 'active',
    };
  }

  // Consulta os produtos das subcategorias de Cama.
  getBedSubcategoryProducts(category: Category) {
    const ids = category.children?.map((child) => child.id);

    if (!ids?.length) return of([]);

    return this.products.getProducts({
      product_type_ids: ids.join(','),
    });
  }

  // Consulta uma página de produtos da categoria.
  getCategoryPage(category: Category, options: PageOptions) {
    const filters = { ...options.filters };

    if (category.children) {
      if (!category.children.length) {
        return of({
          items: [],
          pagination: {
            total: 0,
            hasMore: false,
            offset: options.offset ?? 0,
            limit: options.limit ?? 20,
          },
        });
      }

      filters['product_type_ids'] = category.children
        .map((child) => child.id)
        .join(',');
    } else if (category.slug !== 'todos') {
      filters['product_type_id'] = category.id;
    }

    return this.products.getProductsPage({ ...options, filters }).pipe(
      map((page) => ({
        ...page,
        items: page.items.map((item) => this.adapt(item)),
      })),
    );
  }

  getProductsByCategory(slug: string): Observable<CatalogProduct[]> {
    return this.products
      .getProducts()
      .pipe(
        map((products) =>
          products
            .map((p) => this.adapt(p))
            .filter((p) => p.active && p.category.slug === slug),
        ),
      );
  }

  getRecommendations(product: CatalogProduct): Observable<CatalogProduct[]> {
    return this.products
      .getRelatedProducts(product.id)
      .pipe(map((items) => items.map((item) => this.adapt(item))));
  }

  // Extrai o ID localizado no final do slug.
  getProductBySlug(slug: string): Observable<CatalogProduct | null> {
    const id = Number(slug.match(/(?:^|-)(\d+)$/)?.[1]);

    if (!Number.isSafeInteger(id) || id <= 0) return of(null);

    return this.products.getProduct(id).pipe(
      map((p) => (p.status === 'active' ? this.adapt(p) : null)),

      catchError((error) =>
        error.status === 404 ? of(null) : throwError(() => error),
      ),
    );
  }

  getCategoryBySlug(slug: string): Observable<Category | null> {
    if (slug === 'todos') return of({ id: 0, slug, name: 'Todos os produtos' });

    return this.products.getProductTypes().pipe(
      map((types) => {
        const categories = types
          .filter((type) => type.name.trim())
          .map((type) => this.category(type.id, type.name.trim()));

        if (slug === CAMA_GROUP.slug) {
          const parent = CATEGORIES.find(
            (category) => category.slug === CAMA_GROUP.slug,
          )!;

          const children = CAMA_GROUP.types.flatMap((name) =>
            categories.filter((category) => category.name === name),
          );

          return { ...parent, children };
        }

        const exact = categories.find((category) => category.slug === slug);

        if (exact) return exact;

        const matches = categories.filter(
          (category) => this.slug(category.name) === slug,
        );

        return matches.length === 1 ? matches[0] : null;
      }),
    );
  }
}
