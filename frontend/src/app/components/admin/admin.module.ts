import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminRoutingModule } from './admin-routing.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ProductComponent } from './product/product.component';
import { PromotionComponent } from './promotion/promotion.component';
import { ReportComponent } from './report/report.component';
import { AdminComponent } from './admin/admin.component';

@NgModule({
  imports: [
    CommonModule,
    AdminRoutingModule,
    DashboardComponent,
    AdminComponent,
    ProductComponent,
    PromotionComponent,
    ReportComponent,
  ],
})
export class AdminModule {}

