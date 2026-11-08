import { authGuard } from './core/guards/auth.guard';
import { ActivatedRouteSnapshot, Routes } from '@angular/router';
import { AdminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
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
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },

  {
    path: 'home',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
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

  {
    // One route configuration preserves the auth panel and video between tabs.
    matcher: (segments) =>
      segments.length === 1 && ['login', 'register'].includes(segments[0].path)
        ? { consumed: segments, posParams: { authPage: segments[0] } }
        : null,
    resolve: {
      selectedTab: (route: ActivatedRouteSnapshot) =>
        route.paramMap.get('authPage') === 'register' ? 1 : 0,
    },
    loadComponent: () =>
      import('./features/authorization/register/register.component').then(
        (m) => m.AuthComponent,
      ),
  },

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
    canMatch: [AdminGuard],
    loadComponent: () =>
      import('./features/product-manage/register/product-create/product-create.component').then(
        (m) => m.ProductCreateComponent,
      ),
  },

  {
    path: 'promotion-register',
    canMatch: [AdminGuard],
    loadComponent: () =>
      import('./features/create-promotion/create-promotion.component').then(
        (m) => m.CreatePromotionComponent,
      ),
  },

  {
    path: 'add-to-promotion',
    canMatch: [AdminGuard],
    loadComponent: () =>
      import('./features/add-to-promotion/add-to-promotion.component').then(
        (m) => m.AddToPromotionComponent,
      ),
  },

  {
    path: 'admin',
    canMatch: [AdminGuard],
    loadChildren: () =>
      import('./components/admin/admin.module').then((m) => m.AdminModule),
  },

  {
    path: '404',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(
        (m) => m.NotFoundComponent,
      ),
  },

  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(
        (m) => m.NotFoundComponent,
      ),
  },
];
