import {signal} from '@angular/core';
import {TestBed,fakeAsync,tick,discardPeriodicTasks} from '@angular/core/testing';
import {provideRouter,ActivatedRoute,convertToParamMap} from '@angular/router';
import {of} from 'rxjs';
import {CampaignComponent} from './campaign.component';
import {CampaignService} from '../../core/services/campaign.service';
import {CatalogService} from '../catalog/services/catalog.service';
import {CartService} from '../../core/services/cart.service';
import {FavoritesService} from '../../core/services/favorites.service';
import {HomeCampaign,Product} from '../../shared/models';

 describe('Campaign showcase',()=>{
 it('renders up to four available unique participants and hides the entire section when ineligible',()=>{
  const product=(id:number):Product=>({id,name:'Produto '+id,status:'active',price:100,quantity:2,measurements:{},promotional_price:100});
  const active=signal<HomeCampaign|null>({id:5,name:'Natal Aconchegante',description:'Coleção cadastrada',imagePath:'uploads/real.webp',startDate:new Date(Date.now()-1000).toISOString(),endDate:new Date(Date.now()+3600000).toISOString(),products:[product(1),product(1),{...product(2),quantity:0},product(3),product(4),product(5),product(6)]});
  TestBed.configureTestingModule({providers:[provideRouter([]),{provide:CampaignService,useValue:{active,now:signal(0),eligible:(c:HomeCampaign|null)=>!!c}},{provide:CatalogService,useValue:{adapt:(p:Product)=>({...p,id:p.id!,slug:String(p.id),active:true,featured:false,category:{id:1,name:'Casa',slug:'casa'},images:[],variants:[]})}},{provide:CartService,useValue:{cart:()=>({items:[]}),pending:signal(new Set()),feedback:signal({})}},{provide:FavoritesService,useValue:{authenticated:()=>false,synchronized:()=>true,loading:()=>false,pending:()=>new Set(),errors:()=>({}),syncError:()=>'',isFavorite:()=>false}}]});
  const fixture=TestBed.createComponent(CampaignComponent);fixture.detectChanges();const root=fixture.nativeElement as HTMLElement;
  expect(root.querySelectorAll('app-product-card').length).toBe(4);
  expect(fixture.componentInstance.products().map(p=>p.id)).toEqual([1,3,4,5]);
  expect(root.querySelector('.campaign-link')?.getAttribute('href')).toBe('/campanha/5');
  expect(root.querySelectorAll('.card-actions a')[0].textContent).toContain('Ver detalhes');
  active.set(null);fixture.detectChanges();expect(root.querySelector('.campaign')).toBeNull();
 });

 it('provides the public campaign list, search, price ordering and shared pagination data',fakeAsync(()=>{
  const products=Array.from({length:15},(_,i)=>({id:i+1,name:'Produto '+(i+1),status:'active',price:100-i,quantity:2,measurements:{},promotional_price:100-i}));
  const campaign={id:5,name:'Natal',description:'Seleção',imagePath:'uploads/real.webp',startDate:new Date(Date.now()-1000).toISOString(),endDate:new Date(Date.now()+10000).toISOString(),products};
  TestBed.configureTestingModule({providers:[{provide:ActivatedRoute,useValue:{snapshot:{paramMap:convertToParamMap({id:'5'})},paramMap:of(convertToParamMap({id:'5'}))}},{provide:CampaignService,useValue:{now:signal(0),eligible:(c:HomeCampaign|null)=>!!c,get:()=>of(campaign)}},{provide:CatalogService,useValue:{adapt:(p:Product)=>({...p,slug:String(p.id),active:true,category:{id:1,name:'Casa',slug:'casa'},images:[],variants:[]})}}]});
  const component=TestBed.runInInjectionContext(()=>new CampaignComponent());tick(0);
  expect(component.fullPage).toBeTrue();expect(component.products().length).toBe(15);expect(component.visibleProducts().length).toBe(12);
  component.sort.set('price_asc');expect(component.products()[0].price).toBe(86);
  component.sort.set('price_desc');expect(component.products()[0].price).toBe(100);
  component.page.set(2);expect(component.visibleProducts().length).toBe(3);
  component.page.set(1);component.search.set('Produto 15');expect(component.products().map(p=>p.id)).toEqual([15]);
  discardPeriodicTasks();
 }));
});
