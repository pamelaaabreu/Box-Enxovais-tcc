import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AdminComponent } from './admin/admin.component';

import { DashboardComponent } from './dashboard/dashboard.component';
import { ProductComponent } from './product/product.component';
import { PromotionComponent } from './promotion/promotion.component';
import { ReportComponent } from './report/report.component';

import { AdminGuard } from '../../core/guards/admin.guard';

import { ProductManageComponent } from '../../features/product-manage/product-manage.component';
import { CreatePromotionComponent } from '../../features/create-promotion/create-promotion.component';
import { AddToPromotionComponent } from '../../features/add-to-promotion/add-to-promotion.component';

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    canActivate: [AdminGuard],

    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },

      // DASHBOARD
      {
        path: 'dashboard',
        component: DashboardComponent,
      },

      // PRODUTOS
      {
        path: 'products',
        children: [
          {
            path: '',
            component: ProductComponent,
          },

          {
            path: 'manage',
            component: ProductManageComponent,
          },
        ],
      },

      // PROMOÇÕES
      {
        path: 'promotions',
        children: [
          {
            path: 'create',
            component: CreatePromotionComponent,
          },

          {
            path: 'add-product',
            component: AddToPromotionComponent,
          },
        ],
      },
      // RELATÓRIOS
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
