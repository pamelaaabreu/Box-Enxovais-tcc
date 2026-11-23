import { AdminDataTableComponent } from '../../../../shared/components/admin-data-table/admin-data-table.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { Component, LOCALE_ID, DestroyRef, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminPageHeaderComponent } from '../../../../shared/components/admin-page-header/admin-page-header.component';
import { AdminStateComponent } from '../../../../shared/components/admin-state/admin-state.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { AdminOrderPage, orderStatus, orderPayment } from '../../orders/services/admin-orders.service';
import { AdminCustomersService } from '../services/admin-customers.service';
import type { CustomerDetails } from '../models/customer.models';
registerLocaleData(localePt,'pt-BR');
@Component({selector:'app-admin-customer-detail',standalone:true,providers:[{provide:LOCALE_ID,useValue:'pt-BR'}],imports:[AdminDataTableComponent,StatusBadgeComponent,CurrencyPipe,DatePipe,RouterLink,AdminPageHeaderComponent,AdminStateComponent,PaginationComponent],templateUrl:'./admin-customer-detail.component.html',styleUrl:'./admin-customer-detail.component.scss'})
export class AdminCustomerDetailComponent {
 private readonly api=inject(AdminCustomersService);
 private readonly route=inject(ActivatedRoute);
 private readonly router=inject(Router);
 private readonly destroy=inject(DestroyRef);
 private detailRequest?:Subscription;
 private ordersRequest?:Subscription;
 private id='';
 readonly loading=signal(true);
 readonly error=signal('');
 readonly missing=signal(false);
 readonly customer=signal<CustomerDetails|null>(null);
 readonly orders=signal<AdminOrderPage>({orders:[],total:0,approved:0,cancelled:0});
 readonly ordersLoading=signal(true);
 readonly ordersError=signal('');
 readonly page=signal(1);
 readonly statusLabel=orderStatus;
 readonly paymentLabel=orderPayment;
 constructor(){this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(p=>{this.id=p.get('id')??'';this.load();});this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(p=>{const n=Number(p.get('page'));this.page.set(Number.isInteger(n)&&n>0?n:1);if(this.customer())this.loadOrders();});}
 load(){this.detailRequest?.unsubscribe();this.ordersRequest?.unsubscribe();this.customer.set(null);this.loading.set(true);this.error.set('');this.missing.set(false);this.detailRequest=this.api.detail(this.id).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:c=>{this.customer.set(c);this.loading.set(false);this.loadOrders();},error:e=>{this.loading.set(false);this.missing.set(e.status===404);this.error.set('Não foi possível consultar este cliente. Tente novamente.');}});}
 loadOrders(){this.ordersRequest?.unsubscribe();this.ordersLoading.set(true);this.ordersError.set('');this.ordersRequest=this.api.orders(this.id,this.page()).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:orders=>{this.orders.set(orders);this.ordersLoading.set(false);},error:()=>{this.ordersLoading.set(false);this.ordersError.set('Não foi possível carregar o histórico de pedidos.');}});}
 changePage(page:number){void this.router.navigate([],{relativeTo:this.route,queryParams:{page},queryParamsHandling:'merge'});}
}
