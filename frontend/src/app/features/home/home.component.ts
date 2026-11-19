import { TrustBarComponent } from '../../components/trust-bar/trust-bar.component';
import {
  Component,
  HostListener,
  ViewEncapsulation,
  inject,
  computed,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { CatalogService } from '../catalog/services/catalog.service';
import { Product } from '../../shared/models';
import { FooterComponent } from '../../components/footer/footer.component';
import { CarouselModule } from 'ngx-bootstrap/carousel';
import { CommonModule } from '@angular/common';
import { MainNavbarComponent } from '../../components/main-navbar/main-navbar.component';
import { CarouselComponent } from '../../components/carousel/carousel.component';
import { TopWelcomeHeaderComponent } from '../../components/top-welcome-header/top-welcome-header.component';
import { TopNavbarComponent } from '../../components/top-navbar/top-navbar.component';
import { FeaturedProductsComponent } from '../featured-products/featured-products.component';
import { ShopByCategoryComponent } from '../shop-by-category/shop-by-category.component';

import { NewsletterComponent } from '../newsletter/newsletter.component';
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  imports: [
    FooterComponent,
    CarouselModule,
    CommonModule,
    MainNavbarComponent,
    CarouselComponent,
    TrustBarComponent,
    TopWelcomeHeaderComponent,
    TopNavbarComponent,
    FeaturedProductsComponent,
    ShopByCategoryComponent,
    RouterLink,
    NewsletterComponent,
    FooterComponent,
  ],
  styleUrl: './home.component.scss',
  encapsulation: ViewEncapsulation.Emulated,
})
export class HomeComponent {
  readonly catalogAdapter = inject(CatalogService);
  private readonly http = inject(HttpClient);
  private readonly categories = toSignal(
    this.http
      .get<
        { name: string; slug: string; imagePath: string }[]
      >('http://localhost:8080/home/categories')
      .pipe(catchError(() => of([]))),
    { initialValue: [] },
  );
  readonly collections = computed(() =>
    ['cama', 'toalhas'].flatMap((slug) =>
      this.categories().filter(
        (category) => category.slug === slug && category.imagePath,
      ),
    ),
  );
  private readonly catalog = toSignal(
    this.http
      .get<{ items: Product[] }>('http://localhost:8080/products?limit=100')
      .pipe(catchError(() => of({ items: [] }))),
    { initialValue: { items: [] } },
  );
  readonly qualityProduct = computed(() =>
    this.catalog().items.find(
      (product) =>
        product.status === 'active' &&
        product.image_paths?.length &&
        product.measurements?.['Material'] &&
        product.measurements?.['Composição têxtil'] &&
        product.measurements?.['Acabamento'],
    ),
  );
  isScrolled = false;

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    // Se o scroll vertical for maior que 10 pixels, ativa o estado 'scrolled'
    if (window.pageYOffset > 10) {
      this.isScrolled = true;
    } else {
      this.isScrolled = false;
    }
  }
}
