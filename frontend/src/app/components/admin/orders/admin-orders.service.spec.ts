import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AdminOrdersService } from './admin-orders.service';
describe('AdminOrdersService',()=>{
 let api:AdminOrdersService;let http:HttpTestingController;
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});api=TestBed.inject(AdminOrdersService);http=TestBed.inject(HttpTestingController);});
 afterEach(()=>http.verify());
 it('sends server pagination and combined filters',()=>{api.list({page:2,search:'Ana',status:'cancelled',dateFrom:'2026-01-01'}).subscribe(v=>expect(v.total).toBe(1));const req=http.expectOne(r=>r.url.endsWith('/admin/orders'));expect(req.request.params.get('page')).toBe('2');expect(req.request.params.get('search')).toBe('Ana');expect(req.request.params.get('status')).toBe('cancelled');req.flush({data:{orders:[],total:1,approved:0,cancelled:1}});});
 it('keeps historical amounts and missing breakdowns from the API',()=>{api.detail('12').subscribe(v=>{expect(v.total).toBe(25);expect(v.discount).toBeNull();});http.expectOne('http://localhost:8080/admin/orders/12').flush({data:{id:12,total:25,discount:null}});});
 it('cancels through the existing reason contract without client stock mutations',()=>{api.cancel(12).subscribe();const req=http.expectOne('http://localhost:8080/admin/orders/12/cancel');expect(req.request.method).toBe('POST');expect(req.request.body.reasonCode).toBe('other');expect(req.request.body.quantity).toBeUndefined();req.flush({success:true});});
 it('propagates permission and integrity errors',()=>{api.cancel(12).subscribe({error:err=>expect(err.status).toBe(409)});http.expectOne('http://localhost:8080/admin/orders/12/cancel').flush({message:'Não permitido'},{status:409,statusText:'Conflict'});});
});
