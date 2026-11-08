import { Component, inject, OnInit } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, CommonModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
})
export class AdminComponent implements OnInit {
  private authService = inject(AuthService);

  isSidebarCollapsed = false;
  isProductMenuOpen = false;
  isPromotionMenuOpen = false;
  userName: string | null = null;
  userEmail: string | null = null;

  constructor(public router: Router) {}

  ngOnInit(): void {
    this.userName = this.authService.getUserName();
    this.userEmail = this.authService.getUserEmail();

    this.router.events.subscribe(() => {
      this.autoOpenMenus();
    });

    this.autoOpenMenus();
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleProductMenu(event: Event): void {
    event.stopPropagation();

    this.isProductMenuOpen = !this.isProductMenuOpen;
  }

  togglePromotionMenu(event: Event): void {
    event.stopPropagation();

    this.isPromotionMenuOpen = !this.isPromotionMenuOpen;
  }

  collapseAllMenus(): void {
    this.isProductMenuOpen = false;
    this.isPromotionMenuOpen = false;
  }

  autoOpenMenus(): void {
    const currentUrl = this.router.url;

    this.isProductMenuOpen = currentUrl.includes('/admin/products');

    this.isPromotionMenuOpen = currentUrl.includes('/admin/promotions');
  }

  logout(): void {
    this.authService.logout();
  }
}
