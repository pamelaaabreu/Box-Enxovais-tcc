import { AdminPageHeaderComponent } from '../../../shared/components/admin-page-header/admin-page-header.component';
import { Component, inject, signal } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin',
  imports: [AdminPageHeaderComponent, RouterLink, RouterLinkActive, RouterOutlet, MatIconModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly menuOpen = signal(false);
  readonly section = signal('');
  readonly isProductCreate = signal(false);
  readonly title = signal('Dashboard');
  readonly subtitle = signal('Visão geral de pedidos, catálogo e estoque.');
  readonly name = this.auth.getUserName();
  readonly email = this.auth.getUserEmail();
  readonly firstName = this.name?.trim().split(/\s+/)[0] || 'Administrador';
  readonly pendingPages = [
    { label: 'Pedidos', icon: 'receipt_long' },
    { label: 'Métricas analíticas', icon: 'monitoring' },
    { label: 'Informações de clientes', icon: 'groups' },
  ];
  readonly initials = (this.name || this.email || 'Administrador')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  constructor() {
    this.syncPage();
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.syncPage());
  }

  private syncPage(): void {
    const section = this.router.url.split(/[/?#]/)[2];
    this.section.set(section);
    this.isProductCreate.set(
      this.router.url.split(/[?#]/)[0] === '/admin/products/manage',
    );
    if (this.isProductCreate()) {
      this.title.set('Cadastrar produto');
      this.subtitle.set('Gerencie as informações e imagens dos produtos da loja.');
      this.menuOpen.set(false);
      return;
    }
    this.menuOpen.set(false);
    const pages: Record<string, [string, string]> = {
      catalog: ['Cadastros', 'Gerencie as categorias e marcas do catálogo.'],
      products: ['Produtos', 'Gerencie o catálogo da loja.'],
      promotions: ['Promoções', 'Gerencie campanhas, produtos e ofertas da sua loja.'],
      reports: ['Relatórios', 'Consulte os relatórios da loja.'],
    };
    const [title, subtitle] = pages[section] ?? [
      'Dashboard',
      'Visão geral de pedidos, catálogo e estoque.',
    ];
    this.title.set(title);
    this.subtitle.set(subtitle);
  }

  logout(): void {
    this.auth.logout();
  }
}
