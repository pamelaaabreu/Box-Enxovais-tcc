import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting,HttpTestingController } from '@angular/common/http/testing';
import { AdminCustomersService } from './admin-customers.service';
describe('AdminCustomersService',()=>{
 let api:AdminCustomersService;let http:HttpTestingController;
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});api=TestBed.inject(AdminCustomersService);http=TestBed.inject(HttpTestingController);});afterEach(()=>http.verify());
 it('uses server pagination and a name/email query',()=>{api.list(2,'ana@example.test').subscribe();const req=http.expectOne(r=>r.url.endsWith('/admin/customers'));expect(req.request.method).toBe('GET');expect(req.request.params.get('page')).toBe('2');expect(req.request.params.get('search')).toBe('ana@example.test');req.flush({data:{customers:[],total:0}});});
 it('loads only the selected customer detail',()=>{api.detail('12').subscribe(c=>expect(c.id).toBe(12));http.expectOne('http://localhost:8080/admin/customers/12').flush({data:{id:12}});});
 it('scopes order history to the customer and requested page',()=>{api.orders('12',3).subscribe();const req=http.expectOne('http://localhost:8080/admin/customers/12/orders?page=3');expect(req.request.method).toBe('GET');req.flush({data:{orders:[],total:0}});});
 it('propagates not found and communication errors',()=>{api.detail('999').subscribe({error:err=>expect(err.status).toBe(404)});http.expectOne('http://localhost:8080/admin/customers/999').flush({message:'Cliente não encontrado.'},{status:404,statusText:'Not Found'});});
});
