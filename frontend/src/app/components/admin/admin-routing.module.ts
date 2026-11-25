import { ProductVariantsPageComponent } from '../../features/product-manage/product-variants-page/product-variants-page.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminComponent } from './admin/admin.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ProductComponent } from './product/product.component';
import { ReportComponent } from './report/report.component';
import { AdminGuard } from '../../core/guards/admin.guard';
import { ProductManageComponent } from '../../features/product-manage/product-manage.component';
import { CreatePromotionComponent } from '../../features/create-promotion/create-promotion.component';
import { CatalogRegistrationComponent } from './catalog-registration/catalog-registration.component';

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    canActivate: [AdminGuard],

    children: [
      // Clientes.
      {
        path: 'customers',
        loadComponent: () =>
          import('./customers/admin-customers/admin-customers.component').then(
            (m) => m.AdminCustomersComponent,
          ),
      },
      {
        path: 'customers/:id',
        loadComponent: () =>
          import('./customers/admin-customer-detail/admin-customer-detail.component').then(
            (m) => m.AdminCustomerDetailComponent,
          ),
      },

      // Pedidos.
      {
        path: 'orders',
        loadComponent: () =>
          import('./orders/admin-orders/admin-orders.component').then(
            (m) => m.AdminOrdersComponent,
          ),
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./orders/admin-order-detail/admin-order-detail.component').then(
            (m) => m.AdminOrderDetailComponent,
          ),
      },

      // Avaliações da experiência.
      {
        path: 'experience-reviews',
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
        path: 'products',
        children: [
          {
            path: ':id/edit',
            component: ProductManageComponent,
            canDeactivate: [(page: ProductManageComponent) => page.canLeave()],
          },
          {
            path: ':id/images',
            component: ProductManageComponent,
            canDeactivate: [(page: ProductManageComponent) => page.canLeave()],
          },
          {
            path: ':id/variants',
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
            path: 'manage',
            component: ProductManageComponent,
            canDeactivate: [(page: ProductManageComponent) => page.canLeave()],
          },
        ],
      },

      // Administração de promoções.
      {
        path: 'promotions',
        children: [
          {
            path: '',
            pathMatch: 'full',
            component: CreatePromotionComponent,
            data: { listing: true },
          },
          {
            path: 'create',
            pathMatch: 'full',
            redirectTo: 'new',
          },
          {
            path: 'add-product',
            pathMatch: 'full',
            redirectTo: '',
          },
          {
            path: 'new',
            component: CreatePromotionComponent,
            canDeactivate: [
              (page: CreatePromotionComponent) => page.canLeave(),
            ],
          },
          {
            path: ':id/edit',
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
        path: 'catalog',
        children: [
          {
            path: 'categories',
            component: CatalogRegistrationComponent,
            data: { kind: 'categories' },
          },
          {
            path: 'brands',
            component: CatalogRegistrationComponent,
            data: { kind: 'brands' },
          },
          {
            path: 'shipping-ranges',
            loadComponent: () =>
              import('./shipping-ranges/shipping-ranges.component').then(
                (module) => module.ShippingRangesComponent,
              ),
          },
        ],
      },

      // Relatórios.
      {
        path: 'reports',
        component: ReportComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
