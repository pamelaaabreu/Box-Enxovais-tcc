import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FavoritesComponent } from './favorites.component';
import { FavoritesService } from '../../core/services/favorites.service';
import { CartService } from '../../core/services/cart.service';
import { CatalogService } from '../catalog/services/catalog.service';
import { CatalogLayoutComponent } from '../catalog/components/catalog-layout/catalog-layout.component';
import { Page } from '../../core/services/pagination.service';
import { Product } from '../../shared/models';
import { CatalogProduct } from '../catalog/interfaces/product.interface';

@Component({ selector: 'app-catalog-layout', standalone: true, template: '<ng-content />' })
class TestFavoritesLayoutComponent {}

const product = (id: number, overrides: Partial<Product> = {}): Product => ({id,name:'Produto '+id,price:100,quantity:8,status:'active',measurements:{},promotional_price:0,...overrides});
const adapt = (p: Product): CatalogProduct => ({...p,id:p.id!,slug:String(p.id),active:p.status==='active',featured:false,description:p.description??'',category:{id:1,name:'Casa',slug:'casa'},images:[],variants:(p.variants??[]).map(v=>({...v,images:[]}))});

describe('Favorites page', () => {
 function setup(items: Product[] = [], total = items.length, limit = 20) {
  const page = signal<Page<Product> | null>({items,pagination:{offset:0,limit,total,hasMore:total>limit}});
  const ids = signal<ReadonlySet<number>>(new Set(items.map(p=>p.id!)));
  const favorites = {
   page,ids,pageLoading:signal(false),pageError:signal(''),syncError:signal(''),loading:signal(false),
   synchronized:signal(true),pending:signal<ReadonlySet<number>>(new Set()),authenticated:()=>true,errors:()=>({}),
   isFavorite:(id:number)=>ids().has(id),openPage:jasmine.createSpy(),closePage:jasmine.createSpy(),loadPage:jasmine.createSpy(),
   synchronize:jasmine.createSpy(),toggle:jasmine.createSpy('toggle').and.callFake((id:number)=>{
    ids.update(current=>new Set([...current].filter(value=>value!==id)));
    page.update(current=>current&&({...current,items:current.items.filter(p=>p.id!==id),pagination:{...current.pagination,total:current.pagination.total-1}}));
   }),
  };
  const cart={cart:()=>({items:[]}),pending:()=>new Set(),feedback:()=>({}),add:jasmine.createSpy('add')};
  const recommendations=jasmine.createSpy('recommendations').and.returnValue(of([]));
  TestBed.configureTestingModule({providers:[provideRouter([]),{provide:FavoritesService,useValue:favorites},{provide:CartService,useValue:cart},{provide:CatalogService,useValue:{adapt,getRecommendations:recommendations}}]});
  TestBed.overrideComponent(FavoritesComponent,{remove:{imports:[CatalogLayoutComponent]},add:{imports:[TestFavoritesLayoutComponent]}});
  const fixture=TestBed.createComponent(FavoritesComponent);
  return {fixture,root:fixture.nativeElement as HTMLElement,favorites,cart,recommendations};
 }
 it('renders loading, empty and retry states, and disables purchasing unavailable products',()=>{
  const {fixture,root,favorites}=setup();
  favorites.pageLoading.set(true);fixture.detectChanges();
  expect(favorites.openPage).toHaveBeenCalled();expect(root.textContent).toContain('Carregando favoritos');
  favorites.pageLoading.set(false);favorites.pageError.set('Falha de rede');fixture.detectChanges();
  root.querySelector<HTMLButtonElement>('.state button')!.click();expect(favorites.loadPage).toHaveBeenCalled();
  favorites.pageError.set('');fixture.detectChanges();
  expect(root.textContent).toContain('Sua lista de favoritos está esperando por você.');
  expect(root.querySelector('.state a')?.getAttribute('href')).toBe('/categoria/todos');
  favorites.page.set({items:[product(1,{quantity:0}),product(2,{status:'archived'})],pagination:{offset:0,limit:20,total:2,hasMore:false}});fixture.detectChanges();
  const buttons=[...root.querySelectorAll<HTMLButtonElement>('.card-actions button')];
  expect(buttons.length).toBe(2);expect(buttons.every(b=>b.disabled)).toBeTrue();
  expect(root.querySelectorAll('app-product-card')[1].querySelector('h2 a')?.getAttribute('href')).toBeNull();
  fixture.destroy();expect(favorites.closePage).toHaveBeenCalled();
 });
 it('removes a saved product through the shared service and updates the capsule and empty state',()=>{
  const {fixture,root,favorites}=setup([product(1)]);fixture.detectChanges();
  expect(root.querySelector('.saved-count')?.textContent?.trim()).toBe('1 produto salvo');
  expect(root.querySelector('app-pagination')).toBeNull();
  root.querySelector<HTMLButtonElement>('app-favorite-button button')!.click();fixture.detectChanges();
  expect(favorites.toggle).toHaveBeenCalledOnceWith(1);
  expect(root.querySelectorAll('.saved-products app-product-card').length).toBe(0);
  expect(root.querySelector('.saved-count')?.textContent?.trim()).toBe('0 produtos salvos');
  expect(root.querySelector('.empty-state')).not.toBeNull();
 });
 it('preserves size selection, unavailable variants, localized prices and shared server pagination',()=>{
  const variants=[{id:10,size:'Casal',price:100,stock:2},{id:11,size:'Queen',price:120,stock:2}];
  const {fixture,root,cart,favorites}=setup([product(1,{variants}),product(2,{variants,quantity:0}),product(3)],21);
  fixture.detectChanges();
  const cards=root.querySelectorAll('.saved-products app-product-card');
  expect(cards[0].querySelector('.card-actions a')?.textContent).toContain('Escolher tamanho');
  expect(cards[0].querySelector('.card-actions button')).toBeNull();
  expect(cards[0].querySelector('.price-prefix')?.textContent).toContain('A partir de');
  expect(cards[0].querySelector('app-product-price')?.textContent?.replace(/\s+/g,' ')).toBe('R$ 100,00');
  expect(cards[1].querySelector('.card-actions a')).toBeNull();
  expect(cards[1].querySelector<HTMLButtonElement>('.card-actions button')?.disabled).toBeTrue();
  expect(cards[2].querySelector('.price-prefix')).toBeNull();
  cards[2].querySelector<HTMLButtonElement>('.card-actions button')!.click();expect(cart.add).toHaveBeenCalledOnceWith(3,1);
  root.querySelector<HTMLButtonElement>('app-pagination button[aria-label="Próxima página"]')!.click();
  expect(favorites.loadPage).toHaveBeenCalledWith(20);
  expect(root.querySelector('.saved-count')?.textContent).toContain('21 produtos salvos');
 });
 it('interleaves backend recommendations, excluding saved, duplicate and unavailable products',()=>{
  const {fixture,root,recommendations,favorites}=setup([product(1),product(2)]);
  favorites.ids.set(new Set([1,2,99]));
  recommendations.and.callFake((origin:CatalogProduct)=>of((origin.id===1?[product(2),product(10),product(99),product(12,{quantity:0})]:[product(11),product(10),product(13,{status:'inactive'}),product(14)]).map(adapt)));
  fixture.detectChanges();fixture.detectChanges();
  expect(fixture.componentInstance.recommendations().map(p=>p.id)).toEqual([11,10,14]);
  expect(root.querySelectorAll('.recommendations-grid app-product-card').length).toBe(3);
  expect(recommendations).toHaveBeenCalledTimes(2);
 });
 it('hides recommendations on API failure without blocking the saved list',()=>{
  const {fixture,root,recommendations}=setup([product(1)]);
  recommendations.and.returnValue(throwError(()=>new Error('offline')));
  fixture.detectChanges();fixture.detectChanges();
  expect(root.querySelector('.recommendations')).toBeNull();
  expect(root.querySelectorAll('.saved-products app-product-card').length).toBe(1);
 });
});
