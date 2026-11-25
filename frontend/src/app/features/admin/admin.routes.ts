import { ProductVariantsPageComponent } from './products/product-manage/product-variants-page/product-variants-page.component';
import type { Routes } from '@angular/router';
import { AdminComponent } from './layout/admin.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ProductComponent } from './products/product-list/product.component';
import { ReportComponent } from './reports/report.component';
import { AdminGuard } from '../../core/guards/admin.guard';
import { ProductManageComponent } from './products/product-manage/product-manage.component';
import { CreatePromotionComponent } from './promotions/promotion-manager/create-promotion.component';
import { CatalogRegistrationComponent } from './catalog/catalog-registration/catalog-registration.component';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminComponent,
    canActivate: [AdminGuard],

    children: [
      { path: 'customers', redirectTo: 'clientes', pathMatch: 'prefix' },
      { path: 'orders', redirectTo: 'pedidos', pathMatch: 'prefix' },
      {
        path: 'experience-reviews',
        redirectTo: 'avaliacoes',
        pathMatch: 'prefix',
      },
      { path: 'products', redirectTo: 'produtos', pathMatch: 'prefix' },
      { path: 'promotions', redirectTo: 'promocoes', pathMatch: 'prefix' },
      { path: 'catalog', redirectTo: 'cadastros', pathMatch: 'prefix' },
      { path: 'reports', redirectTo: 'relatorios', pathMatch: 'prefix' },
      // Clientes.
      {
        path: 'clientes',
        loadComponent: () =>
          import('./customers/admin-customers/admin-customers.component').then(
            (m) => m.AdminCustomersComponent,
          ),
      },
      {
        path: 'clientes/:id',
        loadComponent: () =>
          import(
            './customers/admin-customer-detail/admin-customer-detail.component'
          ).then((m) => m.AdminCustomerDetailComponent),
      },

      // Pedidos.
      {
        path: 'pedidos',
        loadComponent: () =>
          import('./orders/admin-orders/admin-orders.component').then(
            (m) => m.AdminOrdersComponent,
          ),
      },
      {
        path: 'pedidos/:id',
        loadComponent: () =>
          import(
            './orders/admin-order-detail/admin-order-detail.component'
          ).then((m) => m.AdminOrderDetailComponent),
      },

      // Avaliações da experiência.
      {
        path: 'avaliacoes',
        loadComponent: () =>
          import('./experience-reviews/experience-reviews.component').then(
            (m) => m.ExperienceReviewsComponent,
          ),
      },

      // Página administrativa inicial.
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        component: DashboardComponent,
      },
      {
        path: 'metrics',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },

      // Administração de produtos.
      {
        path: 'produtos',
        children: [
          { path: ':id/edit', redirectTo: ':id/editar', pathMatch: 'full' },
          { path: ':id/images', redirectTo: ':id/imagens', pathMatch: 'full' },
          {
            path: ':id/variants',
            redirectTo: ':id/variacoes',
            pathMatch: 'full',
          },
          { path: 'manage', redirectTo: 'novo', pathMatch: 'full' },
          {
            path: ':id/editar',
            component: ProductManageComponent,
            canDeactivate: [(page: ProductManageComponent) => page.canLeave()],
          },
          {
            path: ':id/imagens',
            component: ProductManageComponent,
            canDeactivate: [(page: ProductManageComponent) => page.canLeave()],
          },
          {
            path: ':id/variacoes',
            component: ProductVariantsPageComponent,
            canDeactivate: [
              (page: ProductVariantsPageComponent) => page.canLeave(),
            ],
          },
          {
            path: '',
            component: ProductComponent,
          },
          {
            path: 'novo',
            component: ProductManageComponent,
            canDeactivate: [(page: ProductManageComponent) => page.canLeave()],
          },
        ],
      },

      // Administração de promoções.
      {
        path: 'promocoes',
        children: [
          { path: ':id/edit', redirectTo: ':id/editar', pathMatch: 'full' },
          { path: 'new', redirectTo: 'nova', pathMatch: 'full' },
          { path: 'create', redirectTo: 'nova', pathMatch: 'full' },
          { path: 'add-product', redirectTo: '', pathMatch: 'full' },
          {
            path: '',
            pathMatch: 'full',
            component: CreatePromotionComponent,
            data: { listing: true },
          },
          {
            path: 'criar',
            pathMatch: 'full',
            redirectTo: 'nova',
          },
          {
            path: 'adicionar-produto',
            pathMatch: 'full',
            redirectTo: '',
          },
          {
            path: 'nova',
            component: CreatePromotionComponent,
            canDeactivate: [
              (page: CreatePromotionComponent) => page.canLeave(),
            ],
          },
          {
            path: ':id/editar',
            component: CreatePromotionComponent,
            canDeactivate: [
              (page: CreatePromotionComponent) => page.canLeave(),
            ],
          },
          {
            path: ':id',
            component: CreatePromotionComponent,
            data: { readonly: true },
          },
        ],
      },

      // Cadastros auxiliares.
      {
        path: 'cadastros',
        children: [
          { path: 'categories', redirectTo: 'categorias', pathMatch: 'full' },
          { path: 'brands', redirectTo: 'marcas', pathMatch: 'full' },
          {
            path: 'shipping-ranges',
            redirectTo: 'faixas-cep',
            pathMatch: 'full',
          },
          {
            path: 'categorias',
            component: CatalogRegistrationComponent,
            data: { kind: 'categories' },
          },
          {
            path: 'marcas',
            component: CatalogRegistrationComponent,
            data: { kind: 'brands' },
          },
          {
            path: 'faixas-cep',
            loadComponent: () =>
              import(
                './shipping/shipping-ranges/shipping-ranges.component'
              ).then((module) => module.ShippingRangesComponent),
          },
        ],
      },

      // Relatórios.
      {
        path: 'relatorios',
        component: ReportComponent,
      },
    ],
  },
];
