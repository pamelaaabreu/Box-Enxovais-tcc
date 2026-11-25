import { authGuard } from './core/guards/auth.guard';
import { ActivatedRouteSnapshot, Routes } from '@angular/router';
import { AdminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: 'account', redirectTo: 'minha-conta', pathMatch: 'full' },
  {
    path: 'checkout/success/:id',
    redirectTo: 'finalizar-compra/sucesso/:id',
    pathMatch: 'full',
  },
  { path: 'checkout', redirectTo: 'finalizar-compra', pathMatch: 'full' },
  { path: 'favorites', redirectTo: 'favoritos', pathMatch: 'full' },
  { path: 'cart', redirectTo: 'carrinho', pathMatch: 'full' },
  { path: 'home', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'forgot-password', redirectTo: 'recuperar-senha', pathMatch: 'full' },
  { path: 'verify-code', redirectTo: 'verificar-codigo', pathMatch: 'full' },
  { path: 'reset-password', redirectTo: 'redefinir-senha', pathMatch: 'full' },
  { path: 'register', redirectTo: 'cadastro', pathMatch: 'full' },

  // Rotas que exigem autenticação.
  {
    path: 'minha-conta',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/account/account.component').then(
        (m) => m.AccountComponent,
      ),
  },
  {
    path: 'meus-pedidos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/order-history/order-history.component').then(
        (m) => m.OrderHistoryComponent,
      ),
  },
  {
    path: 'meus-pedidos/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/order-history/order-history.component').then(
        (m) => m.OrderHistoryComponent,
      ),
  },
  {
    path: 'finalizar-compra/sucesso/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/checkout/checkout-success/checkout-success.component'
      ).then((m) => m.CheckoutSuccessComponent),
  },
  {
    path: 'finalizar-compra',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/checkout/checkout.component').then(
        (m) => m.CheckoutComponent,
      ),
  },
  {
    path: 'favoritos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/favorites/favorites.component').then(
        (m) => m.FavoritesComponent,
      ),
  },
  {
    path: 'carrinho',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/cart/cart.component').then((m) => m.CartComponent),
  },

  // Redireciona a URL inicial para a Home.
  {
    path: '',
    redirectTo: 'inicio',
    pathMatch: 'full',
  },

  // Rotas públicas.
  {
    path: 'inicio',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'campanha/:id',
    loadComponent: () =>
      import('./features/campaign/campaign.component').then(
        (m) => m.CampaignComponent,
      ),
  },
  {
    path: 'categoria/:slug',
    loadComponent: () =>
      import('./features/catalog/pages/category/category.component').then(
        (m) => m.CategoryComponent,
      ),
  },
  {
    path: 'produto/:slug',
    loadComponent: () =>
      import(
        './features/catalog/pages/product-detail/product-detail.component'
      ).then((m) => m.ProductDetailComponent),
  },

  // Utiliza a mesma configuração de rota para login e cadastro.
  {
    matcher: (segments) =>
      segments.length === 1 && ['login', 'cadastro'].includes(segments[0].path)
        ? { consumed: segments, posParams: { authPage: segments[0] } }
        : null,

    // Define a aba correspondente à URL.
    resolve: {
      selectedTab: (route: ActivatedRouteSnapshot) =>
        route.paramMap.get('authPage') === 'cadastro' ? 1 : 0,
    },

    loadComponent: () =>
      import('./features/authentication/auth/auth.component').then(
        (m) => m.AuthComponent,
      ),
  },

  // Etapas de recuperação de senha.
  {
    path: 'recuperar-senha',
    data: { recoveryStep: 'email' },
    loadComponent: () =>
      import(
        './features/authentication/forgot-password/forgot-password.component'
      ).then(({ ForgotPasswordComponent }) => ForgotPasswordComponent),
  },
  {
    path: 'verificar-codigo',
    data: { recoveryStep: 'otp' },
    loadComponent: () =>
      import(
        './features/authentication/forgot-password/forgot-password.component'
      ).then(({ ForgotPasswordComponent }) => ForgotPasswordComponent),
  },
  {
    path: 'redefinir-senha',
    loadComponent: () =>
      import(
        './features/authentication/reset-password/reset-password.component'
      ).then((m) => m.ResetPasswordComponent),
  },

  // Rotas administrativas.
  {
    path: 'image-upload/:id',
    redirectTo: 'admin/produtos/:id/imagens',
    pathMatch: 'full',
  },
  {
    path: 'product-register',
    redirectTo: 'admin/produtos/novo',
    pathMatch: 'full',
  },

  // Redirecionamentos para as rotas administrativas atuais.
  {
    path: 'promotion-register',
    pathMatch: 'full',
    redirectTo: 'admin/promocoes/nova',
  },
  {
    path: 'add-to-promotion',
    pathMatch: 'full',
    redirectTo: 'admin/promocoes',
  },

  {
    path: 'admin',
    canMatch: [AdminGuard],
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },

  // Página não encontrada.
  {
    path: '404',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(
        (m) => m.NotFoundComponent,
      ),
  },

  // Captura URLs que não correspondem às rotas anteriores.
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(
        (m) => m.NotFoundComponent,
      ),
  },
];
