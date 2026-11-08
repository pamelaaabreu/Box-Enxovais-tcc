import { FavoriteButtonComponent } from '../../shared/favorite-button/favorite-button.component';
import { ProductMediaComponent } from '../catalog/components/product-media/product-media.component';
import { CartService } from '../../core/services/cart.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { Router, RouterLink } from '@angular/router';
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
import { CommonModule, CurrencyPipe } from '@angular/common';

type FeaturedState = { products: Product[]; loading: boolean; error: string };

@Component({
  selector: 'app-featured-products',
  standalone: true,
  imports: [
    FavoriteButtonComponent,
    ProductMediaComponent,
    CommonModule,
    CurrencyPipe,
    RouterLink,
  ],
  templateUrl: './featured-products.component.html',
  styleUrl: './featured-products.component.css',
})
export class FeaturedProductsComponent {
  readonly cart = inject(CartService);
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
            : this.productService.getProductsPage({ limit: 6 });
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
