import { authGuard } from './core/guards/auth.guard';
import { ActivatedRouteSnapshot, Routes } from '@angular/router';
import { AdminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // Rotas que exigem autenticação.
  {
    path: 'account',
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
    path: 'checkout/success/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/checkout/checkout-success/checkout-success.component').then(
        (m) => m.CheckoutSuccessComponent,
      ),
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/checkout/checkout.component').then(
        (m) => m.CheckoutComponent,
      ),
  },
  {
    path: 'favorites',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/favorites/favorites.component').then(
        (m) => m.FavoritesComponent,
      ),
  },
  {
    path: 'cart',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/cart/cart.component').then((m) => m.CartComponent),
  },

  // Redireciona a URL inicial para a Home.
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },

  // Rotas públicas.
  {
    path: 'home',
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
      import('./features/catalog/pages/product-detail/product-detail.component').then(
        (m) => m.ProductDetailComponent,
      ),
  },

  // Utiliza a mesma configuração de rota para login e cadastro.
  {
    matcher: (segments) =>
      segments.length === 1 && ['login', 'register'].includes(segments[0].path)
        ? { consumed: segments, posParams: { authPage: segments[0] } }
        : null,

    // Define a aba correspondente à URL.
    resolve: {
      selectedTab: (route: ActivatedRouteSnapshot) =>
        route.paramMap.get('authPage') === 'register' ? 1 : 0,
    },

    loadComponent: () =>
      import('./features/authorization/register/register.component').then(
        (m) => m.AuthComponent,
      ),
  },

  // Etapas de recuperação de senha.
  {
    path: 'forgot-password',
    data: { recoveryStep: 'email' },
    loadComponent: () =>
      import('./shared/forgot-password/forgot-password.component').then(
        ({ ForgotPasswordComponent }) => ForgotPasswordComponent,
      ),
  },
  {
    path: 'verify-code',
    data: { recoveryStep: 'otp' },
    loadComponent: () =>
      import('./shared/forgot-password/forgot-password.component').then(
        ({ ForgotPasswordComponent }) => ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./shared/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },

  // Rotas administrativas.
  {
    path: 'image-upload/:id',
    canMatch: [AdminGuard],
    loadComponent: () =>
      import('./features/product-manage/images/product-image-upload/product-image-upload.component').then(
        (m) => m.ProductImageUploadComponent,
      ),
  },
  {
    path: 'product-register',

    // Verifica se o administrador pode abandonar o formulário.
    canDeactivate: [
      (
        page: import('./features/product-manage/register/product-create/product-create.component').ProductCreateComponent,
      ) => page.canLeave(),
    ],

    canMatch: [AdminGuard],
    loadComponent: () =>
      import('./features/product-manage/register/product-create/product-create.component').then(
        (m) => m.ProductCreateComponent,
      ),
  },

  // Redirecionamentos para as rotas administrativas atuais.
  {
    path: 'promotion-register',
    pathMatch: 'full',
    redirectTo: 'admin/promotions/new',
  },
  {
    path: 'add-to-promotion',
    pathMatch: 'full',
    redirectTo: 'admin/promotions',
  },

  {
    path: 'admin',
    canMatch: [AdminGuard],
    loadChildren: () =>
      import('./components/admin/admin.module').then((m) => m.AdminModule),
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
