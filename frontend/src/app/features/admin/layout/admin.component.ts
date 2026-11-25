import { DOCUMENT } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { A11yModule } from '@angular/cdk/a11y';
import { Overlay } from '@angular/cdk/overlay';
import { AdminNavigationService } from '../../../shared/services/admin-navigation.service';
import { AdminPageHeaderComponent } from '../../../shared/components/admin-page-header/admin-page-header.component';
import {
  Component,
  DestroyRef,
  HostListener,
  Injector,
  afterNextRender,
  effect,
  inject,
  signal,
} from '@angular/core';
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
  providers: [AdminNavigationService],
  imports: [
    AdminPageHeaderComponent,
    A11yModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatIconModule,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent {
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly navigation = inject(AdminNavigationService);
  readonly menuOpen = this.navigation.opened;
  readonly mobile = this.navigation.compact;
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly scrollBlock = inject(Overlay).scrollStrategies.block();
  private readonly destroy = inject(DestroyRef);
  readonly section = signal('');
  readonly isProductCreate = signal(false);
  readonly title = signal('Dashboard');
  readonly subtitle = signal('Visão geral de pedidos, catálogo e estoque.');
  readonly name = this.auth.getUserName();
  readonly email = this.auth.getUserEmail();
  readonly firstName = this.name?.trim().split(/\s+/)[0] || 'Administrador';
  readonly initials = (this.name || this.email || 'Administrador')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  constructor() {
    this.breakpoints
      .observe('(max-width: 1024px)')
      .pipe(takeUntilDestroyed())
      .subscribe(({ matches }) => {
        this.mobile.set(matches);
        if (!matches) this.closeMenu();
      });
    effect(() => {
      if (this.mobile() && this.menuOpen()) this.scrollBlock.enable();
      else this.scrollBlock.disable();
    });
    this.destroy.onDestroy(() => this.scrollBlock.disable());
    this.syncPage();
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        const restoreFocus = this.mobile() && this.menuOpen();
        this.syncPage();
        if (restoreFocus)
          afterNextRender(
            () => {
              this.document
                .querySelector<HTMLButtonElement>(
                  'button[aria-label="Abrir menu"]',
                )
                ?.focus();
            },
            { injector: this.injector },
          );
      });
  }

  private syncPage(): void {
    const section = this.router.url.split(/[/?#]/)[2];
    this.section.set(section);
    this.isProductCreate.set(
      this.router.url.split(/[?#]/)[0] === '/admin/produtos/novo' ||
        /^\/admin\/produtos\/\d+\/(editar|imagens)$/.test(
          this.router.url.split(/[?#]/)[0],
        ),
    );
    if (this.isProductCreate()) {
      this.title.set(
        this.router.url.includes('/imagens')
          ? 'Imagens do produto'
          : this.router.url.includes('/editar')
            ? 'Editar produto'
            : 'Cadastrar produto',
      );
      this.subtitle.set(
        'Gerencie as informações e imagens dos produtos da loja.',
      );
      this.menuOpen.set(false);
      return;
    }
    this.menuOpen.set(false);
    const pages: Record<string, [string, string]> = {
      cadastros: ['Cadastros', 'Gerencie as categorias e marcas do catálogo.'],
      produtos: ['Produtos', 'Gerencie o catálogo da loja.'],
      promocoes: [
        'Promoções',
        'Gerencie campanhas, produtos e ofertas da sua loja.',
      ],
      relatorios: [
        'Relatórios',
        'Consulte e analise os resultados da loja por período.',
      ],
    };
    const [title, subtitle] = pages[section] ?? [
      'Dashboard',
      'Visão geral de pedidos, catálogo e estoque.',
    ];
    this.title.set(title);
    this.subtitle.set(subtitle);
  }

  @HostListener('keydown.escape')
  closeMenu(): void {
    const restoreFocus = this.mobile() && this.menuOpen();
    this.menuOpen.set(false);
    if (restoreFocus)
      afterNextRender(
        () => {
          this.document
            .querySelector<HTMLButtonElement>('button[aria-label="Abrir menu"]')
            ?.focus();
        },
        { injector: this.injector },
      );
  }

  logout(): void {
    this.auth.logout();
  }
}
