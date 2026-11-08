import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { CartService } from './cart.service';
import { AuthService } from './auth.service';
import { TopNavbarComponent } from '../../components/top-navbar/top-navbar.component';

describe('CartService and header', () => {
 let service: CartService;
 let http: HttpTestingController;
 let token: string | null;
 let changed: Subject<void>;
 const snapshot = (quantity: number) => ({items: quantity ? [{id: 9, productId: 2, name: 'Produto', image: '', quantity, stock: 5, available: true, unitPrice: 129.9, subtotal: 129.9 * quantity}] : [], totalItems: quantity, total: 129.9 * quantity});
 beforeEach(() => {
  token = 'test-session'; changed = new Subject<void>();
  TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
   {provide: AuthService, useValue: {getToken: () => token, userChanged: changed, loadUser: () => {}, isLoggedIn: () => !!token, getUserName: () => 'Teste', getUserRole: () => 'customer'}},
  ]});
  service=TestBed.inject(CartService); http=TestBed.inject(HttpTestingController);
  http.expectOne('http://localhost:8080/cart').flush({data: snapshot(0)});
 });
 afterEach(() => http.verify());
 it('adds, updates, removes and clears the shared badge', () => {
  const fixture=TestBed.createComponent(TopNavbarComponent);fixture.detectChanges();
  service.add(2); service.add(2);
  const add=http.expectOne('http://localhost:8080/cart/items');expect(add.request.body).toEqual({productId:2,quantity:1});
  add.flush({data:snapshot(1)});fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.cart-badge').textContent.trim()).toBe('1');
  service.add(2);http.expectOne('http://localhost:8080/cart/items').flush({data:snapshot(2)});
  expect(service.cart().items.length).toBe(1);expect(service.totalItems()).toBe(2);
  service.update(9,3);const update=http.expectOne('http://localhost:8080/cart/items/9');expect(update.request.method).toBe('PATCH');update.flush({data:snapshot(3)});
  fixture.detectChanges();expect(fixture.nativeElement.querySelector('.cart-badge').textContent.trim()).toBe('3');
  service.remove(9);const remove=http.expectOne('http://localhost:8080/cart/items/9');expect(remove.request.method).toBe('DELETE');remove.flush({data:snapshot(0)});
  service.clear();const clear=http.expectOne('http://localhost:8080/cart');expect(clear.request.method).toBe('DELETE');clear.flush({data:snapshot(0)});
  fixture.detectChanges();expect(fixture.nativeElement.querySelector('.cart-badge').textContent.trim()).toBe('0');
 });
 it('discards pending requests and state when the account changes', () => {
  service.add(2);const request=http.expectOne('http://localhost:8080/cart/items');
  token=null;changed.next();expect(request.cancelled).toBeTrue();expect(service.totalItems()).toBe(0);expect(service.busy()).toBeFalse();
 });
 it('preserves the last confirmed cart on stock errors and permits retry', () => {
  service.add(2);http.expectOne('http://localhost:8080/cart/items').flush({message:'Estoque insuficiente'},{status:409,statusText:'Conflict'});
  expect(service.error()).toBe('Estoque insuficiente');expect(service.totalItems()).toBe(0);expect(service.busy()).toBeFalse();
 });
 it('clears only the removed product feedback after API confirmation', () => {
  service.add(2);http.expectOne('http://localhost:8080/cart/items').flush({data:snapshot(1)});
  const otherItem={...snapshot(1).items[0],id:10,productId:3};
  service.add(3);http.expectOne('http://localhost:8080/cart/items').flush({data:{items:[...snapshot(1).items,otherItem],totalItems:2,total:259.8}});
  service.remove(9);
  expect(service.feedback()[2]).toBe('Adicionado ao carrinho.');
  http.expectOne('http://localhost:8080/cart/items/9').flush({data:{items:[otherItem],totalItems:1,total:129.9}});
  expect(service.feedback()[2]).toBeUndefined();
  expect(service.feedback()[3]).toBe('Adicionado ao carrinho.');
 });
 it('clears feedback when the entire cart is cleared', () => {
  service.add(2);http.expectOne('http://localhost:8080/cart/items').flush({data:snapshot(1)});
  service.clear();
  expect(service.feedback()[2]).toBeTruthy();
  http.expectOne('http://localhost:8080/cart').flush({data:snapshot(0)});
  expect(service.feedback()).toEqual({});
 });
 ['remove','clear'].forEach(operation => it(`preserves feedback when ${operation} fails`, () => {
  service.add(2);http.expectOne('http://localhost:8080/cart/items').flush({data:snapshot(1)});
  if(operation==='remove') service.remove(9); else service.clear();
  http.expectOne(`http://localhost:8080/cart${operation==='remove'?'/items/9':''}`).flush({message:'Falha temporária'},{status:500,statusText:'Error'});
  expect(service.feedback()[2]).toBe(operation === 'remove' ? 'Falha temporária' : 'Adicionado ao carrinho.');
  expect(service.totalItems()).toBe(1);
 }));

});
