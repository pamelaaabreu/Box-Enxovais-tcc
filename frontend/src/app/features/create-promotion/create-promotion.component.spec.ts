import {registerLocaleData} from '@angular/common';
import localePt from '@angular/common/locales/pt';
import {provideRouter} from '@angular/router';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ConfirmDialogService} from '../../shared/components/confirm-dialog/confirm-dialog.service';
import {TestBed} from '@angular/core/testing';
import {Subject,of} from 'rxjs';
import {ProductService} from '../../core/services/product.service';
import {CreatePromotionComponent} from './create-promotion.component';
import {PromoService} from '../../core/services/promo.service';
import {CustomAlertService} from '../../core/services/custom-alert.service';
registerLocaleData(localePt);
function configureRouter(){TestBed.configureTestingModule({providers:[provideRouter([{path:'**',component:CreatePromotionComponent}])]});}

describe('CreatePromotionComponent',()=>{
 beforeEach(configureRouter);
 it('sends configured metadata once and resets after server confirmation',()=>{const result=new Subject<unknown>();const create=jasmine.createSpy().and.returnValue(result);const success=jasmine.createSpy();TestBed.configureTestingModule({providers:[{provide:ProductService,useValue:{getAdminProducts:()=>of([])}},{provide:PromoService,useValue:{createPromotion:create,listCampaigns:()=>of([])}},{provide:CustomAlertService,useValue:{success,error:jasmine.createSpy()}}]});const f=TestBed.createComponent(CreatePromotionComponent);f.componentInstance.promotionData={name:'Natal',description:'Campanha',image_path:'uploads/natal.webp',home_featured:true,status:'active',start_date:'2026-11-01T00:00',end_date:'2026-12-31T23:59'};Object.assign(f.componentInstance.promotionData,{created_at:'2026-11-01T03:00:00Z',updated_at:'2026-11-12T03:00:00Z'});f.componentInstance.onSubmit();f.componentInstance.onSubmit();expect(create).toHaveBeenCalledTimes(1);expect(create.calls.mostRecent().args[0].home_featured).toBeTrue();expect(create.calls.mostRecent().args[0].created_at).toBeUndefined();expect(create.calls.mostRecent().args[0].updated_at).toBeUndefined();expect(f.componentInstance.saving).toBeTrue();result.next({id:1});expect(f.componentInstance.saving).toBeFalse();expect(success).toHaveBeenCalled();expect(f.componentInstance.promotionData.name).toBe('')});

 it('keeps unique participants and restores a saved campaign for editing without leaking its id into the request',()=>{
  const update=jasmine.createSpy().and.returnValue(of({id:4}));
  const service={createPromotion:jasmine.createSpy(),updateCampaign:update,listCampaigns:()=>of([])};
  TestBed.configureTestingModule({providers:[{provide:ProductService,useValue:{getAdminProducts:()=>of([])}},{provide:PromoService,useValue:service},{provide:CustomAlertService,useValue:{success:jasmine.createSpy(),error:jasmine.createSpy()}}]});
  const fixture=TestBed.createComponent(CreatePromotionComponent),component=fixture.componentInstance;
  const product={id:7,name:'Toalha',price:100,quantity:2,status:'active',measurements:{},promotional_price:0};
  component.products=[product];component.select(product);component.select(product);
  expect(component.promotionData.products?.length).toBe(1);
  component.remove(7);expect(component.promotionData.products?.length).toBe(0);
  component.campaigns=[{id:4,name:'Natal',created_at:'2026-11-01T03:00:00Z',updated_at:'2026-11-12T03:00:00Z',status:'active',start_date:'2026-11-01T03:00:00Z',end_date:'2027-01-01T02:59:59Z',products:[{product_id:7,promotional_price:80}]}];
  component.edit(4);expect(component.promotionData.products?.[0].promotional_price).toBe(80);
  component.onSubmit();expect(update).toHaveBeenCalled();
  expect(update.calls.mostRecent().args[1].id).toBeUndefined();
  expect(update.calls.mostRecent().args[1].created_at).toBeUndefined();
  expect(update.calls.mostRecent().args[1].updated_at).toBeUndefined();
 });
 it('rejects an invalid date range before sending a request',()=>{
  const create=jasmine.createSpy(),error=jasmine.createSpy();
  TestBed.configureTestingModule({providers:[{provide:ProductService,useValue:{getAdminProducts:()=>of([])}},{provide:PromoService,useValue:{createPromotion:create}},{provide:CustomAlertService,useValue:{error}}]});
  const component=TestBed.createComponent(CreatePromotionComponent).componentInstance;
  component.promotionData={name:'Natal',status:'active',start_date:'2026-12-02T00:00',end_date:'2026-12-01T00:00'};
  component.onSubmit();expect(create).not.toHaveBeenCalled();expect(error).toHaveBeenCalled();
 });

 it('converts configured percentage and fixed reductions to cent-based individual prices without discounting variants',()=>{
  TestBed.configureTestingModule({providers:[{provide:ProductService,useValue:{getAdminProducts:()=>of([])}},{provide:PromoService,useValue:{}},{provide:CustomAlertService,useValue:{error:jasmine.createSpy()}}]});
  const component=TestBed.createComponent(CreatePromotionComponent).componentInstance;
  component.products=[{id:1,name:'Toalha',price:79.9,quantity:2,status:'active',measurements:{},promotional_price:0},{id:2,name:'Jogo',price:200,quantity:2,status:'active',measurements:{},promotional_price:0,variants:[{id:3,size:'Queen',price:200,stock:2}]}];
  component.select(component.products[0]);component.select(component.products[1]);
  component.discountMode='percentage';component.discountValue=10;component.applyDiscount();
  expect(component.promotionData.products?.[0].promotional_price).toBe(71.91);
  expect(component.promotionData.products?.[1].promotional_price).toBeUndefined();
  component.discountMode='amount';component.discountValue=20;component.applyDiscount();
  expect(component.promotionData.products?.[0].promotional_price).toBe(59.9);
 });

 it('filters every category and registered SKU, confirms a draft selection once and cancels without changes',()=>{
  TestBed.configureTestingModule({providers:[{provide:ProductService,useValue:{getAdminProducts:()=>of([])}},{provide:PromoService,useValue:{}},{provide:CustomAlertService,useValue:{error:jasmine.createSpy()}}]});
  const component=TestBed.createComponent(CreatePromotionComponent).componentInstance;
  component.products=[{id:1,name:'Tapete',category_name:'Decoração',product_type_id:6,price:80,quantity:4,status:'active',sku:'BX-TAP-001',measurements:{},promotional_price:0},{id:2,name:'Caminho',category_name:'Mesa',product_type_id:5,price:60,quantity:3,status:'active',measurements:{},promotional_price:0}];
  expect(component.categories.map(c=>c.name)).toEqual(['Decoração','Mesa']);
  component.openPicker();component.categoryId=6;component.search='bx-tap-001';
  expect(component.matchingProducts.map(p=>p.id)).toEqual([1]);
  const event={target:{checked:true}} as unknown as Event;
  component.toggleDraft(1,event);expect(component.promotionData.products?.length).toBe(0);
  component.categoryId=5;component.search='';component.toggleDraft(2,event);
  component.confirmSelection();expect(component.promotionData.products?.map(p=>p.product_id)).toEqual([1,2]);
  component.confirmSelection();expect(component.promotionData.products?.length).toBe(2);
  component.remove(1);component.openPicker();component.toggleDraft(1,event);component.cancelPicker();
  expect(component.promotionData.products?.map(p=>p.product_id)).toEqual([2]);
 });
 it('creates an empty campaign explicitly and displays the empty-participant guidance',()=>{
  const create=jasmine.createSpy().and.returnValue(of({id:9}));
  TestBed.configureTestingModule({providers:[{provide:ProductService,useValue:{getAdminProducts:()=>of([])}},{provide:PromoService,useValue:{createPromotion:create,listCampaigns:()=>of([])}},{provide:CustomAlertService,useValue:{success:jasmine.createSpy(),error:jasmine.createSpy()}}]});
  const fixture=TestBed.createComponent(CreatePromotionComponent);fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('Nenhum produto nesta campanha');
  expect(fixture.nativeElement.querySelector('input[name="product_id"]')).toBeNull();
  fixture.componentInstance.promotionData={name:'Campanha vazia',status:'active',start_date:'2026-11-01T00:00',end_date:'2026-12-31T23:59',products:[]};
  fixture.componentInstance.onSubmit();expect(create.calls.mostRecent().args[0].products).toEqual([]);
 });
});

describe('Promotion campaign workspace',()=>{
 beforeEach(configureRouter);
 let create:jasmine.Spy, update:jasmine.Spy, upload:jasmine.Spy, confirm:jasmine.Spy;
 const product={id:1,name:'Toalha Areia',sku:'BX-TOA-001',category_name:'Toalhas',product_type_id:3,price:100,quantity:8,status:'active',measurements:{},promotional_price:0,image_paths:['http://localhost:8080/uploads/toalha.webp']};
 const record={id:4,name:'Coleção',description:'Campanha',status:'active',start_date:'2026-11-01T03:00:00Z',end_date:'2027-01-01T02:59:59Z',home_featured:false,image_path:'uploads/campanha.webp',products:[{product_id:1,promotional_price:80}]};
 beforeEach(()=>{
  create=jasmine.createSpy().and.returnValue(of({id:5}));update=jasmine.createSpy().and.returnValue(of({id:4}));upload=jasmine.createSpy().and.returnValue(of({image_path:'uploads/nova.webp'}));confirm=jasmine.createSpy().and.returnValue({afterClosed:()=>of(false)});
  TestBed.configureTestingModule({imports:[NoopAnimationsModule],providers:[{provide:ProductService,useValue:{getAdminProducts:()=>of([product])}},{provide:PromoService,useValue:{createPromotion:create,updateCampaign:update,listCampaigns:()=>of([record]),uploadCampaignImage:upload}},{provide:CustomAlertService,useValue:{success:jasmine.createSpy(),error:jasmine.createSpy()}},{provide:ConfirmDialogService,useValue:{open:confirm}}]});
 });
 function setup(){const fixture=TestBed.createComponent(CreatePromotionComponent);fixture.detectChanges();return {fixture,page:fixture.componentInstance,host:fixture.nativeElement as HTMLElement};}
 it('keeps one form and its data while switching between four accessible panels',()=>{
  const {fixture,page,host}=setup();page.promotionData.name='Promoção preenchida';page.select(product);
  const tabs=host.querySelectorAll<HTMLButtonElement>('[role=tab]');expect(tabs.length).toBe(4);
  for(let index=0;index<4;index++){tabs[index].click();fixture.detectChanges();expect(page.promotionData.name).toBe('Promoção preenchida');expect(page.promotionData.products?.length).toBe(1);expect(tabs[index].getAttribute('aria-selected')).toBe('true');}
  expect(host.querySelectorAll('form').length).toBe(1);
  expect(host.querySelectorAll('[role=tabpanel]:not([hidden])').length).toBe(1);
 });
 it('renders the list with real counts and periods and a read-only campaign view',()=>{
  const {fixture,page,host}=setup();page.view='list';fixture.detectChanges();expect(host.textContent).toContain('Coleção');expect(host.querySelector('tbody')?.textContent).toContain('Visualizar');
  page.view='detail';page.edit(4);fixture.detectChanges();expect(page.dirty).toBeFalse();expect(host.querySelector('fieldset')?.disabled).toBeTrue();page.onSubmit();expect(update).not.toHaveBeenCalled();
 });
 it('normalizes relative, root-relative and absolute image paths without doubling the API URL',()=>{
  const {page}=setup();for(const path of ['uploads/toalha.webp','/uploads/toalha.webp','http://localhost:8080/uploads/toalha.webp'])expect(page.assetUrl(path)).toBe('http://localhost:8080/uploads/toalha.webp');expect(page.assetUrl('javascript:alert(1)')).toBe('');
 });
 it('shows real product photographs and SKU in the lateral picker',()=>{
  const {fixture,page,host}=setup();page.chooseTab(1);page.openPicker();fixture.detectChanges();expect(host.querySelector('.product-picker')?.getAttribute('aria-modal')).toBe('true');expect(host.querySelector('.picker-product img')?.getAttribute('src')).toBe('http://localhost:8080/uploads/toalha.webp');expect(host.querySelector('.picker-product')?.textContent).toContain('BX-TOA-001');
 });
 it('keeps selections across search, categories and picker pagination',()=>{
  const {page}=setup();page.products=Array.from({length:25},(_,i)=>({...product,id:i+1,sku:'BX-TOA-'+(i+1),product_type_id:i%2 ? 3 : 4,category_name:i%2 ? 'Toalhas' : 'Mesa'}));page.openPicker();const checked={target:{checked:true}} as unknown as Event;
  page.toggleDraft(1,checked);page.pickerPage=2;page.toggleDraft(20,checked);page.search='BX-TOA-25';page.pickerPage=1;page.toggleDraft(25,checked);page.categoryId=3;page.search='';expect(page.draftIds.size).toBe(3);page.confirmSelection();expect(page.promotionData.products?.map(p=>p.product_id)).toEqual([1,20,25]);page.remove(20);expect(page.promotionData.products?.length).toBe(2);
 });
 it('uploads and previews a real file and rejects invalid files without changing the campaign',()=>{
  const {fixture,page,host}=setup();page.chooseTab(2);page.uploadFile(new File(['image'],'imagem.webp',{type:'image/webp'}));fixture.detectChanges();expect(upload).toHaveBeenCalledTimes(1);expect(host.querySelector('.campaign-preview')?.getAttribute('src')).toBe('http://localhost:8080/uploads/nova.webp');page.uploadFile(new File(['x'],'arquivo.txt',{type:'text/plain'}));expect(upload).toHaveBeenCalledTimes(1);expect(page.promotionData.image_path).toBe('uploads/nova.webp');
 });
 it('chooses an existing real asset from the library without uploading or fabricating images',()=>{
  const {page}=setup();expect(page.libraryImages).toContain('uploads/toalha.webp');page.libraryOpen=true;page.chooseImage('uploads/toalha.webp');expect(page.libraryOpen).toBeFalse();expect(page.promotionData.image_path).toBe('uploads/toalha.webp');expect(upload).not.toHaveBeenCalled();
 });
 it('loads campaign participants and image without marking them dirty and keeps data on rejected cancellation',async()=>{
  const {page}=setup();page.edit(4);expect(page.dirty).toBeFalse();expect(page.promotionData.products?.[0].promotional_price).toBe(80);expect(page.promotionData.image_path).toBe('uploads/campanha.webp');page.promotionData.name='Alterada';expect(page.dirty).toBeTrue();await page.cancel();expect(page.promotionData.name).toBe('Alterada');confirm.and.returnValue({afterClosed:()=>of(true)});await page.cancel();expect(page.promotionData.name).toBe('');expect(page.dirty).toBeFalse();
 });
 it('shows validation on the matching tab and never invents empty discount rows',()=>{
  const {fixture,page,host}=setup();page.chooseTab(3);fixture.detectChanges();expect(host.querySelector('#campaign-panel-3 tbody')).toBeNull();expect(host.querySelector('#campaign-panel-3')?.textContent).toContain('Selecione os produtos');page.onSubmit();expect(page.activeTab).toBe(0);expect(create).not.toHaveBeenCalled();
  page.promotionData={name:'Campanha',status:'active',description:'Texto',start_date:'2026-11-01T00:00',end_date:'2026-12-01T00:00',home_featured:true,products:[]};page.onSubmit();expect(page.activeTab).toBe(2);expect(create).not.toHaveBeenCalled();
 });
 it('calculates actual final prices without accumulating discounts or changing original prices',()=>{
  const {page}=setup();page.select(product);page.discountMode='percentage';page.discountValue=20;page.applyDiscount();page.applyDiscount();expect(page.finalPrice(1)).toBe(80);expect(page.discountPercent(1)).toBe(20);expect(page.products[0].price).toBe(100);page.discountValue=101;page.applyDiscount();expect(page.finalPrice(1)).toBe(80);page.discountMode='amount';page.discountValue=150;page.applyDiscount();expect(page.finalPrice(1)).toBe(80);
 });
 it('does not publish an empty campaign in the readiness summary',()=>{
  const {page}=setup();page.edit(4);page.promotionData.home_featured=true;page.promotionData.products=[];expect(page.homeSummary).toContain('Adicione produtos');
 });
 it('moves between tabs with arrow keys and retains the active focus target',()=>{
  const {fixture,page,host}=setup();const tabs=host.querySelectorAll<HTMLButtonElement>('[role=tab]');tabs[0].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));fixture.detectChanges();expect(page.activeTab).toBe(1);expect(document.activeElement).toBe(tabs[1]);
 });
 it('keeps the action bar in document flow and keeps its established static positioning',()=>{
  const {host}=setup();expect(getComputedStyle(host.querySelector('.promotion-form-container')!).overflowX).toBe('clip');expect(getComputedStyle(host.querySelector('.action-bar')!).position).toBe('static');
 });
 it('keeps unsaved fields after an API failure and allows retry without duplicating an in-flight save',()=>{
  const response=new Subject<unknown>();create.and.returnValue(response);const {page}=setup();page.promotionData={name:'Preservada',status:'active',start_date:'2026-11-01T00:00',end_date:'2027-01-01T00:00',products:[]};page.onSubmit();page.onSubmit();expect(create).toHaveBeenCalledTimes(1);response.error({error:{message:'Falha temporária'}});expect(page.saving).toBeFalse();expect(page.promotionData.name).toBe('Preservada');expect(page.dirty).toBeTrue();
 });

 it('keeps the reference summary and tab badges tied to real participants and discounts',()=>{
  const {fixture,page,host}=setup();expect(host.querySelector('.campaign-summary')?.textContent).toContain('0 produtos vinculados');page.select(product);page.discountMode='percentage';page.discountValue=20;page.applyDiscount();fixture.detectChanges();expect(host.querySelector('.campaign-summary')?.textContent).toContain('1 produto vinculado');expect(page.discountSummary).toBe('20%');expect(host.querySelector('#campaign-tab-1')?.textContent).toContain('1');
 });
 it('edits discounts per participant and preserves original prices and unsupported variants',()=>{
  const {page}=setup();page.select(product);page.discountMode='percentage';page.setRowDiscount(1,25);expect(page.finalPrice(1)).toBe(75);expect(page.rowDiscountValue(1)).toBe(25);page.discountMode='amount';expect(page.rowDiscountValue(1)).toBe(25);page.setRowDiscount(1,30);expect(page.finalPrice(1)).toBe(70);expect(page.products[0].price).toBe(100);page.setRowDiscount(1,150);expect(page.invalidPrice(1)).toBeTrue();expect(page.discountSummary).toBe('Revisar descontos');page.setRowDiscount(1,null);expect(page.finalPrice(1)).toBe(100);
 });

 it('uses the campaign name in the compact header and breadcrumb without changing the form',()=>{
  const {fixture,page,host}=setup();expect(host.querySelector('app-admin-page-header h1')?.textContent?.trim()).toBe('Nova promoção');expect(host.querySelector('.editing-label')?.textContent?.trim()).toBe('Nova');page.edit(4);fixture.detectChanges();expect(host.querySelector('app-admin-page-header h1')?.textContent?.trim()).toBe('Coleção');expect(host.querySelector('app-admin-page-header [aria-current]')?.textContent?.trim()).toBe('Coleção');expect(host.querySelector('.editing-label')?.textContent?.trim()).toBe('Editando');expect(page.dirty).toBeFalse();expect(host.querySelectorAll('app-admin-page-header header').length).toBe(1);
 });
 it('returns to the campaign list through the breadcrumb and previews through the existing Images tab',()=>{
  const {fixture,page,host}=setup();const preview=host.querySelector<HTMLButtonElement>('.home-preview-action')!;expect(preview.disabled).toBeTrue();page.edit(4);fixture.detectChanges();expect(preview.disabled).toBeFalse();preview.click();fixture.detectChanges();expect(page.activeTab).toBe(2);expect(page.promotionData.products?.[0].promotional_price).toBe(80);expect(host.querySelector<HTMLAnchorElement>('app-admin-page-header nav a')!.getAttribute('href')).toBe('/admin/promotions');
 });

 it('shows status near preview and uses the real update timestamp',()=>{
  const {fixture,page,host}=setup();page.edit(4);page.campaigns[0].updated_at='2026-11-12T12:00:00Z';fixture.detectChanges();expect(page.campaignMeta).toContain('Atualizado em 12/11');expect(host.querySelector('.campaign-heading-actions .campaign-status')?.textContent).toContain('Ativa');expect(host.querySelector('.section-heading')?.textContent).not.toContain('0 produtos vinculados');
 });
 it('filters campaigns without modifying their data',()=>{
  const {page}=setup();page.campaignSearch='inexistente';expect(page.visibleCampaigns.length).toBe(0);page.campaignSearch='';page.campaignFilter='Todas';expect(page.visibleCampaigns.length).toBe(page.campaigns.length);expect(page.campaignCount('Todas')).toBe(page.campaigns.length);
 });

});
