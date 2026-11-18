import { HttpClient } from '@angular/common/http';
import { ProductCardComponent } from '../catalog/components/product-card/product-card.component';
import { CatalogService } from '../catalog/services/catalog.service';
import { CartService } from '../../core/services/cart.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { Router } from '@angular/router';
import {
  Component,
  Input,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../shared/models';

type FeaturedState = { products: Product[]; loading: boolean; error: string };

@Component({
  selector: 'app-featured-products',
  standalone: true,
  imports: [ProductCardComponent],
  templateUrl: './featured-products.component.html',
  styleUrl: './featured-products.component.scss',
})
export class FeaturedProductsComponent {
  readonly cart = inject(CartService);
  readonly catalog = inject(CatalogService);
  private readonly http = inject(HttpClient);
  readonly bestSellers = signal(false);
  readonly favorites = inject(FavoritesService);
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);
  @Input() titulo: string = 'Título Padrão';
  readonly backendUrl = 'http://localhost:8080';
  readonly favoritesOnly = signal(false);
  private readonly refresh = signal(0);
  private readonly query = computed(() => {
    this.refresh();
    if (!this.favoritesOnly()) return { kind: 'all' as const };
    if (!this.favorites.authenticated()) return { kind: 'guest' as const };
    if (!this.favorites.synchronized())
      return {
        kind: 'waiting' as const,
        loading: this.favorites.loading(),
        error: this.favorites.syncError(),
      };
    return { kind: 'favorites' as const, ids: this.favorites.ids() };
  });

  readonly state = toSignal(
    toObservable(this.query).pipe(
      switchMap((query) => {
        if (query.kind === 'waiting')
          return of<FeaturedState>({
            products: [],
            loading: query.loading,
            error: query.error,
          });
        if (
          query.kind === 'guest' ||
          (query.kind === 'favorites' && query.ids.size === 0)
        ) {
          return of<FeaturedState>({ products: [], loading: false, error: '' });
        }
        const request =
          query.kind === 'favorites'
            ? this.favorites.getProductsPage({
                limit: 6,
                filters: { status: 'active' },
              })
            : this.http
                .get<{
                  products: Product[];
                  bestSellers: boolean;
                }>('http://localhost:8080/home/highlights')
                .pipe(
                  map((result) => {
                    this.bestSellers.set(result.bestSellers);
                    return { items: result.products };
                  }),
                );
        return request.pipe(
          map(
            (page): FeaturedState => ({
              products: page.items,
              loading: false,
              error: '',
            }),
          ),
          startWith<FeaturedState>({ products: [], loading: true, error: '' }),
          catchError(() =>
            of<FeaturedState>({
              products: [],
              loading: false,
              error: 'Não foi possível carregar os produtos. Tente novamente.',
            }),
          ),
        );
      }),
    ),
    {
      initialValue: { products: [], loading: true, error: '' } as FeaturedState,
    },
  );
  readonly products = computed(() => this.state().products);

  constructor() {
    effect(() => {
      if (!this.favorites.authenticated()) this.favoritesOnly.set(false);
    });
  }

  selectFilter(favoritesOnly: boolean): void {
    if (favoritesOnly && !this.favorites.authenticated()) {
      void this.router.navigate(['/login']);
      return;
    }
    this.favoritesOnly.set(favoritesOnly);
  }

  retry(): void {
    if (this.favoritesOnly() && !this.favorites.synchronized())
      this.favorites.synchronize();
    else this.refresh.update((value) => value + 1);
  }
}
