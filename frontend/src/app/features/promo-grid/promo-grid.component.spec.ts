import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting,HttpTestingController} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';

import {PromoGridComponent} from './promo-grid.component';
import {CartService} from '../../core/services/cart.service';
import {FavoritesService} from '../../core/services/favorites.service';
describe('Home campaign',()=>{
 let http:HttpTestingController;const add=jasmine.createSpy('add');
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([]),{provide:CartService,useValue:{cart:()=>({items:[]}),pending:()=>new Set(),feedback:()=>({}),add}},{provide:FavoritesService,useValue:{authenticated:()=>false,isFavorite:()=>false,pending:()=>new Set(),loading:()=>false,errors:()=>({}),syncError:()=>'',toggle:()=>{}}}]});http=TestBed.inject(HttpTestingController)});
 afterEach(()=>http.verify());
 it('hides offers when no active campaign exists',()=>{const f=TestBed.createComponent(PromoGridComponent);http.expectOne('http://localhost:8080/home/campaign').flush(null);f.detectChanges();expect(f.nativeElement.querySelector('section')).toBeNull()});
 it('uses the stored campaign and a shared card with valid discount and cart behavior',()=>{const f=TestBed.createComponent(PromoGridComponent);http.expectOne('http://localhost:8080/home/campaign').flush({name:'Natal',description:'Campanha cadastrada',startDate:'2026-11-01',endDate:'2026-12-31',imagePath:'',products:[{id:42,name:'Tapete',price:100,promotional_price:80,quantity:8,status:'active',measurements:{},image_paths:[]}]});f.detectChanges();expect(f.nativeElement.textContent).toContain('Natal');expect(f.nativeElement.querySelector('del').textContent).toContain('100');expect(f.nativeElement.querySelector('app-product-price strong').textContent).toContain('80');f.nativeElement.querySelector('.card-actions button').click();expect(add).toHaveBeenCalledWith(42,1)});
 it('does not display an invalid discount',()=>{const f=TestBed.createComponent(PromoGridComponent);http.expectOne('http://localhost:8080/home/campaign').flush({name:'Natal',description:'',startDate:'2026-11-01',endDate:'2026-12-31',imagePath:'',products:[{id:42,name:'Tapete',price:100,promotional_price:120,quantity:8,status:'active',measurements:{}}]});f.detectChanges();expect(f.nativeElement.querySelector('del')).toBeNull();expect(f.nativeElement.querySelector('app-product-price strong').textContent).toContain('100')});
});
