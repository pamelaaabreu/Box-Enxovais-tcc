import { Component, LOCALE_ID, DestroyRef, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminPageHeaderComponent } from '../../../shared/components/admin-page-header/admin-page-header.component';
import { AdminStateComponent } from '../../../shared/components/admin-state/admin-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { AdminCustomersService, CustomerPage } from './admin-customers.service';
registerLocaleData(localePt,'pt-BR');
@Component({selector:'app-admin-customers',standalone:true,providers:[{provide:LOCALE_ID,useValue:'pt-BR'}],imports:[CurrencyPipe,DatePipe,RouterLink,ReactiveFormsModule,AdminPageHeaderComponent,AdminStateComponent,PaginationComponent],templateUrl:'./admin-customers.component.html',styleUrls:['../orders/admin-orders.scss','./admin-customers.scss','../../../shared/css/admin-adaptive-table.scss']})
export class AdminCustomersComponent {
 private readonly api=inject(AdminCustomersService);
 private readonly route=inject(ActivatedRoute);
 private readonly router=inject(Router);
 private readonly destroy=inject(DestroyRef);
 private request?:Subscription;
 private appliedSearch='';
 readonly loading=signal(true);
 readonly error=signal('');
 readonly page=signal(1);
 readonly search=new FormControl('',{nonNullable:true});
 readonly data=signal<CustomerPage>({customers:[],total:0,withOrders:0,withoutOrders:0});
 constructor(){this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(p=>{this.appliedSearch=p.get('search')??'';this.search.setValue(this.appliedSearch);const n=Number(p.get('page'));this.page.set(Number.isInteger(n)&&n>0?n:1);this.load();});}
 load(){this.request?.unsubscribe();this.loading.set(true);this.error.set('');this.request=this.api.list(this.page(),this.appliedSearch).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:data=>{this.data.set(data);this.loading.set(false);},error:()=>{this.loading.set(false);this.error.set('Não foi possível carregar os clientes. Tente novamente.');}});}
 apply(page=1){void this.router.navigate([],{relativeTo:this.route,queryParams:{search:this.search.value.trim()||null,page}});}
 clear(){this.search.reset();this.apply();}
}
