import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '../../core/services/favorites.service';
import { CartService } from '../../core/services/cart.service';
import { CatalogService } from '../catalog/services/catalog.service';
import { CatalogLayoutComponent } from '../catalog/components/catalog-layout/catalog-layout.component';
import { ProductCardComponent } from '../catalog/components/product-card/product-card.component';

@Component({
 selector: 'app-favorites', standalone: true,
 imports: [RouterLink, CatalogLayoutComponent, ProductCardComponent],
 templateUrl: './favorites.component.html', styleUrl: './favorites.component.css',
 changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoritesComponent {
 readonly favorites = inject(FavoritesService);
 readonly cart = inject(CartService);
 private readonly catalog = inject(CatalogService);
 readonly products = computed(() => (this.favorites.page()?.items ?? []).map(product => this.catalog.adapt(product)));
 constructor() {
  this.favorites.openPage();
  inject(DestroyRef).onDestroy(() => this.favorites.closePage());
 }
}
