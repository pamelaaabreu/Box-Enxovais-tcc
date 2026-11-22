import type { AdminOrderPage, AdminOrderDetails } from '../../../shared/types/orders/admin-order';
export type { AdminOrder, AdminOrderPage, AdminOrderDetails } from '../../../shared/types/orders/admin-order';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
registerLocaleData(localePt, 'pt-BR');
export const orderStatus = (status:string) => status === 'cancelled' ? 'Cancelado' : status === 'simulated_approved' ? 'Aprovado' : status;
export const orderPayment = (payment:string) => ({pix:'Pix',card:'Cartão',boleto:'Boleto'}[payment] ?? payment);
@Injectable({providedIn:'root'})
export class AdminOrdersService {
 private readonly http=inject(HttpClient);
 private readonly url='http://localhost:8080/admin/orders';
 list(filters:Record<string,string|number>){return this.http.get<{data:AdminOrderPage}>(this.url,{params:new HttpParams({fromObject:filters})}).pipe(map(r=>r.data));}
 detail(id:string){return this.http.get<{data:AdminOrderDetails}>(`${this.url}/${encodeURIComponent(id)}`).pipe(map(r=>r.data));}
 cancel(id:number){return this.http.post(`${this.url}/${id}/cancel`,{reasonCode:'other',reasonDetails:'Cancelamento solicitado pela administração da loja.'});}
 image(path:string){return path ? 'http://localhost:8080/'+path.replace(/^\//,'') : '';}
}
