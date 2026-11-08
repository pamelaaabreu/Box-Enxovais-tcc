import { Component, HostListener, ViewEncapsulation } from '@angular/core';
import { FooterComponent } from '../../components/footer/footer.component';
import { CarouselModule } from 'ngx-bootstrap/carousel';
import { CommonModule } from '@angular/common';
import { MainNavbarComponent } from '../../components/main-navbar/main-navbar.component';
import { CarouselComponent } from '../../components/carousel/carousel.component';
import { TopWelcomeHeaderComponent } from '../../components/top-welcome-header/top-welcome-header.component';
import { TopNavbarComponent } from '../../components/top-navbar/top-navbar.component';
import { FeaturedProductsComponent } from '../featured-products/featured-products.component';
import { TrustBarComponent } from '../../components/trust-bar/trust-bar.component';
import { ShopByCategoryComponent } from '../shop-by-category/shop-by-category.component';
import { TestimonialsComponent } from '../testimonials/testimonials.component';
import { PromoGridComponent } from '../promo-grid/promo-grid.component';
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
    TopWelcomeHeaderComponent,
    TopNavbarComponent,
    FeaturedProductsComponent,
    TrustBarComponent,
    ShopByCategoryComponent,
    TestimonialsComponent,
    PromoGridComponent,
    NewsletterComponent,
    FooterComponent,
  ],
  styleUrl: './home.component.css',
  encapsulation: ViewEncapsulation.Emulated,
})
export class HomeComponent {
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
