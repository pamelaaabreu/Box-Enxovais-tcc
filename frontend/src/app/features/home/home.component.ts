import { TrustBarComponent } from '../../components/trust-bar/trust-bar.component';
import {
  Component,
  HostListener,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { CampaignService } from '../../core/services/campaign.service';
import { CampaignComponent } from '../campaign/campaign.component';
import { FooterComponent } from '../../components/footer/footer.component';
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
    CommonModule,
    MainNavbarComponent,
    CarouselComponent,
    TrustBarComponent,
    TopWelcomeHeaderComponent,
    TopNavbarComponent,
    FeaturedProductsComponent,
    ShopByCategoryComponent,
    CampaignComponent,
    NewsletterComponent,
  ],
  styleUrl: './home.component.scss',
  encapsulation: ViewEncapsulation.Emulated,
})
export class HomeComponent {
  readonly campaigns = inject(CampaignService);
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
