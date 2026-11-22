import { Component, LOCALE_ID, DestroyRef, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { AdminPageHeaderComponent } from '../../../shared/components/admin-page-header/admin-page-header.component';
import { AdminStateComponent } from '../../../shared/components/admin-state/admin-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { AdminOrdersService, AdminOrderPage, orderStatus, orderPayment } from './admin-orders.service';
@Component({selector:'app-admin-orders',standalone:true,providers:[{provide:LOCALE_ID,useValue:"pt-BR"}],imports:[CurrencyPipe,DatePipe,RouterLink,ReactiveFormsModule,AdminPageHeaderComponent,AdminStateComponent,PaginationComponent],templateUrl:'./admin-orders.component.html',styleUrl:'./admin-orders.scss'})
export class AdminOrdersComponent {
 private readonly api=inject(AdminOrdersService);
 private readonly route=inject(ActivatedRoute);
 private readonly router=inject(Router);
 private readonly destroy=inject(DestroyRef);
 private request?:Subscription;
 readonly loading=signal(true);
 readonly error=signal('');
 readonly page=signal(1);
 readonly data=signal<AdminOrderPage>({orders:[],total:0,approved:0,cancelled:0});
 readonly filters=new FormGroup({search:new FormControl('',{nonNullable:true}),status:new FormControl('',{nonNullable:true}),dateFrom:new FormControl('',{nonNullable:true}),dateTo:new FormControl('',{nonNullable:true})});
 readonly statusLabel=orderStatus;
 readonly paymentLabel=orderPayment;
 constructor(){this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(p=>{
 this.filters.setValue({search:p.get('search')??'',status:p.get('status')??'',dateFrom:p.get('dateFrom')??'',dateTo:p.get('dateTo')??''});
 const page=Number(p.get('page'));this.page.set(Number.isInteger(page)&&page>0?page:1);this.load();
 });}
 load(){this.request?.unsubscribe();this.loading.set(true);this.error.set('');
 const params:Record<string,string|number>={page:this.page()};for(const [key,value]of Object.entries(this.filters.getRawValue())){if(value)params[key]=value;}
 this.request=this.api.list(params).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:data=>{this.data.set(data);this.loading.set(false);},error:err=>{this.loading.set(false);this.error.set(err.error?.message??'Não foi possível carregar os pedidos. Tente novamente.');}});}
 apply(page=1){void this.router.navigate([],{relativeTo:this.route,queryParams:{...this.filters.getRawValue(),page}});}
 clear(){this.filters.reset();this.apply();}
}
