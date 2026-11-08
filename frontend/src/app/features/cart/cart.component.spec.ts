import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { CartComponent } from './cart.component';
import { AuthService } from '../../core/services/auth.service';

describe('CartComponent', () => {
 it('shows the empty state returned by the API', () => {
  TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([]),
   {provide:AuthService,useValue:{getToken:()=> 'test',userChanged:new Subject<void>(),loadUser:()=>{},isLoggedIn:()=>true,getUserName:()=> 'Teste',getUserRole:()=> 'customer'}}]});
  const fixture=TestBed.createComponent(CartComponent);fixture.detectChanges();
  const http=TestBed.inject(HttpTestingController);
  http.expectOne('http://localhost:8080/cart').flush({data:{items:[],totalItems:0,total:0}});
  fixture.detectChanges();expect(fixture.nativeElement.querySelector('.empty').textContent).toContain('Seu carrinho está vazio');
  expect(fixture.nativeElement.querySelector('.summary')).toBeNull();http.verify();
 });
 it('blocks increases for an unavailable item and refreshes stock from the API', () => {
  TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([]),
   {provide:AuthService,useValue:{getToken:()=> 'test',userChanged:new Subject<void>(),loadUser:()=>{},isLoggedIn:()=>true,getUserName:()=> 'Teste',getUserRole:()=> 'customer'}}]});
  const fixture=TestBed.createComponent(CartComponent);
  const http=TestBed.inject(HttpTestingController);
  const item={id:9,productId:1,name:'Produto',image:'',quantity:1,stock:10,available:false,unitPrice:10,subtotal:10};
  http.expectOne('http://localhost:8080/cart').flush({data:{items:[item],totalItems:1,total:10}});
  fixture.detectChanges();
  const increase=()=>fixture.nativeElement.querySelector('[aria-label="Aumentar quantidade de Produto"]') as HTMLButtonElement;
  expect(increase().disabled).toBeTrue(); increase().click();
  http.expectNone('http://localhost:8080/cart/items/9');
  expect(fixture.nativeElement.querySelector('[aria-label="Remover Produto"]').disabled).toBeFalse();
  fixture.componentInstance.cart.load();
  http.expectOne('http://localhost:8080/cart').flush({data:{items:[{...item,available:true}],totalItems:1,total:10}});
  fixture.detectChanges(); expect(increase().disabled).toBeFalse();
  increase().click();
  http.expectOne('http://localhost:8080/cart/items/9').flush({message:'Este produto ficou sem estoque'},{status:409,statusText:'Conflict'});
  fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Este produto ficou sem estoque');
  expect(fixture.componentInstance.cart.cart().items[0].quantity).toBe(1);
  fixture.componentInstance.cart.load();
  http.expectOne('http://localhost:8080/cart').flush({data:{items:[{...item,stock:0}],totalItems:1,total:10}});
  fixture.detectChanges(); expect(increase().disabled).toBeTrue(); http.verify();
 });

});
