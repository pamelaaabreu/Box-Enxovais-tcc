import { CurrencyPipe, DecimalPipe, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { AdminStateComponent } from '../../../shared/components/admin-state/admin-state.component';
import { PeriodFilterComponent } from '../../../shared/components/period-filter/period-filter.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ReportData, ReportKind } from './report.models';
registerLocaleData(localePt,'pt-BR');
@Component({selector:'app-report',imports:[CurrencyPipe,DecimalPipe,ReactiveFormsModule,RouterLink,MatIconModule,AdminStateComponent,PeriodFilterComponent,PaginationComponent],templateUrl:'./report.component.html',styleUrl:'./report.component.scss'})
export class ReportComponent {
 private readonly http=inject(HttpClient);
 private readonly route=inject(ActivatedRoute);
 private readonly router=inject(Router);
 private readonly destroy=inject(DestroyRef);
 private request?:Subscription;
 private download?:Subscription;
 private applied:Record<string,string>={};
 readonly kinds:{value:ReportKind;label:string}[]=[{value:'sales',label:'Vendas'},{value:'products',label:'Produtos'},{value:'customers',label:'Clientes'},{value:'stock',label:'Estoque'}];
 readonly kind=signal<ReportKind>('sales');
 readonly data=signal<ReportData|null>(null);
 readonly state=signal<'loading'|'error'|'loaded'>('loading');
 readonly error=signal('');
 readonly exporting=signal(false);
 readonly exportError=signal('');
 readonly filter=new FormGroup({period:new FormControl('30d',{nonNullable:true}),dateFrom:new FormControl('',{nonNullable:true}),dateTo:new FormControl('',{nonNullable:true}),group:new FormControl('auto',{nonNullable:true})});
 readonly controls=new FormGroup({search:new FormControl('',{nonNullable:true}),status:new FormControl('',{nonNullable:true}),sort:new FormControl('',{nonNullable:true})});
 readonly labels:Record<string,string>={orders:'Total de pedidos',approvedOrders:'Pedidos aprovados',cancelledOrders:'Pedidos cancelados',revenueCents:'Faturamento aprovado',averageTicketCents:'Ticket médio',soldProducts:'Produtos vendidos',units:'Unidades',unsoldProducts:'Produtos sem vendas',buyers:'Clientes que compraram',newCustomers:'Novos clientes',recurringCustomers:'Clientes recorrentes',averageCustomerCents:'Média por cliente comprador',activeProducts:'Produtos ativos',outOfStock:'Produtos esgotados',lowStock:'Produtos com estoque baixo'};
 readonly metricKeys:Record<ReportKind,string[]>={sales:['orders','approvedOrders','cancelledOrders','revenueCents','averageTicketCents'],products:['soldProducts','units','revenueCents','unsoldProducts'],customers:['buyers','newCustomers','recurringCustomers','averageCustomerCents'],stock:['activeProducts','outOfStock','lowStock','units']};
 readonly stats=computed(()=>this.metricKeys[this.kind()].map(key=>({key,value:this.data()?.stats[key]??0,label:this.labels[key],money:key.endsWith('Cents')})));
 readonly active=computed(()=>{const p=this.parameters();return !!(p['search']||p['status']||p['sort']||p['period']&&p['period']!=='30d');});
 private readonly parameters=signal<Record<string,string>>({});
 constructor(){this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(p=>{const kind=p.get('type');this.kind.set(this.kinds.some(k=>k.value===kind)?kind as ReportKind:'sales');this.filter.setValue({period:p.get('period')??'30d',dateFrom:p.get('dateFrom')??'',dateTo:p.get('dateTo')??'',group:'auto'});this.controls.setValue({search:p.get('search')??'',status:p.get('status')??'',sort:p.get('sort')??''});this.applied={...this.params(),page:p.get('page')??'1',pageSize:'20'};this.parameters.set(this.applied);this.load();});}
 private params(){const p:Record<string,string>={...this.controls.getRawValue()};if(this.kind()!=='stock'){p['period']=this.filter.controls.period.value;if(p['period']==='custom'){p['dateFrom']=this.filter.controls.dateFrom.value;p['dateTo']=this.filter.controls.dateTo.value;}}return p;}
 apply(page=1){const params={type:this.kind(),...this.params(),page:String(page)};if(this.route.snapshot?.queryParamMap.get('type')===this.kind()&&Object.entries(params).filter(([key])=>key!=='type').every(([key,value])=>(this.applied[key]??'')===value)){this.load();return;}void this.router.navigate([],{relativeTo:this.route,queryParams:params});}
 select(kind:ReportKind){this.kind.set(kind);this.controls.reset({search:'',status:'',sort:''});this.apply();}
 clear(){this.filter.reset({period:'30d',dateFrom:'',dateTo:'',group:'auto'});this.controls.reset({search:'',status:'',sort:''});this.apply();}
 load(){this.request?.unsubscribe();this.download?.unsubscribe();this.exporting.set(false);this.exportError.set('');this.state.set('loading');this.error.set('');this.request=this.http.get<ReportData>('http://localhost:8080/admin/reports/'+this.kind(),{params:new HttpParams({fromObject:this.applied})}).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:data=>{this.data.set(data);this.state.set('loaded');},error:e=>{this.error.set(e.status===400?e.error?.message??'Revise os filtros.':'Não foi possível carregar o relatório. Tente novamente.');this.state.set('error');}});}
 export(){if(this.kind()==='customers'||this.exporting())return;this.exporting.set(true);this.exportError.set('');this.download=this.http.get('http://localhost:8080/admin/reports/'+this.kind()+'/export',{params:new HttpParams({fromObject:this.applied}),responseType:'blob'}).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:blob=>{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='relatorio-'+this.kind()+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);this.exporting.set(false);},error:()=>{this.exportError.set('Não foi possível exportar. Tente novamente ou refine os filtros para até 10.000 registros.');this.exporting.set(false);}});}
 private readonly dates=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});
 formatDate(value:string){return this.dates.format(new Date(value)).replace(',','');}
 statusLabel(s:string){return ({simulated_approved:'Aprovado em simulação',cancelled:'Cancelado',low:'Estoque baixo',out:'Esgotado',available:'Em estoque'} as Record<string,string>)[s]??s;}
 paymentLabel(s:string){return ({pix:'Pix',card:'Cartão',boleto:'Boleto'} as Record<string,string>)[s]??s;}
}
