import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '../../core/services/favorites.service';
import { CartService } from '../../core/services/cart.service';
import { CatalogService } from '../catalog/services/catalog.service';
import { CatalogLayoutComponent } from '../catalog/components/catalog-layout/catalog-layout.component';
import { ProductCardComponent } from '../catalog/components/product-card/product-card.component';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [
    PaginationComponent,
    RouterLink,
    CatalogLayoutComponent,
    ProductCardComponent,
  ],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoritesComponent {
  readonly favorites = inject(FavoritesService);
  readonly cart = inject(CartService);
  private readonly catalog = inject(CatalogService);
  readonly products = computed(() =>
    (this.favorites.page()?.items ?? []).map((product) =>
      this.catalog.adapt(product),
    ),
  );
  readonly savedCount = computed(
    () => this.favorites.page()?.pagination.total ?? 0,
  );
  private readonly related = toSignal(
    toObservable(this.products).pipe(
      switchMap((products) => {
        const seeds = products.filter((product) => product.active).slice(0, 4);
        return seeds.length
          ? forkJoin(
              seeds.map((product) =>
                this.catalog
                  .getRecommendations(product)
                  .pipe(catchError(() => of([]))),
              ),
            ).pipe(
              map((groups) =>
                Array.from(
                  {
                    length: Math.max(...groups.map((group) => group.length), 0),
                  },
                  (_, index) =>
                    groups.flatMap((group) =>
                      group[index] ? [group[index]] : [],
                    ),
                ).flat(),
              ),
            )
          : of([]);
      }),
    ),
    { initialValue: [] },
  );
  readonly recommendations = computed(() => {
    const excluded = new Set([
      ...this.favorites.ids(),
      ...this.products().map((product) => product.id),
    ]);
    const eligible = this.related()
      .filter((product) => {
        if (
          !product.active ||
          product.quantity <= 0 ||
          excluded.has(product.id)
        )
          return false;
        excluded.add(product.id);
        return true;
      })
      ;
    const categories = new Set<number>();
    const images = new Set<string>();
    const diverse = eligible.filter(product => {
      const image = product.images[0]?.url;
      if (categories.has(product.category.id) || (image && images.has(image))) return false;
      categories.add(product.category.id);
      if (image) images.add(image);
      return true;
    });
    const chosen = new Set(diverse.map(product => product.id));
    return [...diverse,...eligible.filter(product => !chosen.has(product.id))].slice(0,4);
  });
  constructor() {
    this.favorites.openPage();
    inject(DestroyRef).onDestroy(() => this.favorites.closePage());
  }
}
