import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideNgxMask } from 'ngx-mask';
import { CustomAlertService } from '../../../../core/services/custom-alert.service';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { CatalogLayoutComponent } from '../../components/catalog-layout/catalog-layout.component';
import { CartService } from '../../../../core/services/cart.service';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProductDetailComponent } from './product-detail.component';
import { CatalogService } from '../../services/catalog.service';
import { CatalogProduct } from '../../interfaces/product.interface';

describe('ProductDetail variant selection', () => {
  it('resolves color and size without selecting missing or out-of-stock combinations', () => {
    const product = { variants: [
      { id: 1, sku: 'SKU-1', color: 'Sálvia', size: 'Casal', stock: 3 },
      { id: 2, sku: 'SKU-2', color: 'Sálvia', size: 'Queen', stock: 0 },
      { id: 3, sku: 'SKU-3', color: 'Creme', size: 'Queen', stock: 2 },
      { id: 4, sku: 'SKU-4', color: 'Branco', size: 'Casal', stock: 0 },
    ] } as CatalogProduct;
    TestBed.configureTestingModule({ providers: [
      { provide: CartService, useValue: { cart: () => ({ items: [] }) } },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ slug: 'produto' })) } },
      { provide: CatalogService, useValue: { getProductBySlug: () => of(product), getRecommendations: () => of([]) } },
    ] });
    TestBed.overrideComponent(ProductDetailComponent, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(ProductDetailComponent);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    expect(page.selectedVariant()?.id).toBe(1);
    expect(page.isSizeAvailable('Queen')).toBeFalse();
    page.selectSize('Queen');
    expect(page.selectedVariant()?.id).toBe(1);
    page.selectColor('Creme');
    expect(page.selectedVariant()?.id).toBe(3);
    expect(page.selectedSize()).toBe('Queen');
    expect(page.isSizeAvailable('Casal')).toBeFalse();
    page.selectColor('Branco');
    expect(page.selectedVariant()?.id).toBe(3);
    expect(page.isColorAvailable('Branco')).toBeFalse();
    expect(page.availableSizes()).toEqual(['Casal', 'Queen']);
  });
});

@Component({selector:'app-catalog-layout',standalone:true,template:'<ng-content />'})
class TestProductLayout {}

describe('Product stock experience',()=>{
 let http: HttpTestingController;
 let product: CatalogProduct;
 beforeEach(()=>{
  product={id:42,name:'Produto',stock:10,quantity:10,status:'active',price:129.9,images:[],variants:[],category:{id:1,name:'Cama',slug:'cama'},measurements:{}} as unknown as CatalogProduct;
  TestBed.configureTestingModule({imports:[NoopAnimationsModule],providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),provideNgxMask(),
   {provide:AuthService,useValue:{getToken:()=> 'test',userChanged:new Subject<void>()}},
   {provide:CatalogService,useValue:{getProductBySlug:()=>of(product),getRecommendations:()=>of([])}},
  ]});
  TestBed.overrideComponent(ProductDetailComponent,{remove:{imports:[CatalogLayoutComponent]},add:{imports:[TestProductLayout]}});
  http=TestBed.inject(HttpTestingController);
 });
 afterEach(()=>http.verify());
 function render(items: unknown[] = []){
  const fixture=TestBed.createComponent(ProductDetailComponent);
  http.expectOne('http://localhost:8080/cart').flush({data:{items,totalItems:items.length,total:0}});
  fixture.detectChanges();
  http.expectOne(r => r.url === 'http://localhost:8080/favorites').flush({items:[],pagination:{offset:0,limit:100,total:0,hasMore:false}});
  fixture.detectChanges();return fixture;
 }
 [0,1,5,6,40].forEach(stock=>it(`shows availability for ${stock} units`,()=>{
  product.stock=stock;
  const fixture=render();
  const label=fixture.nativeElement.querySelector('.availability').textContent.trim();
  expect(label).toBe(stock===0?'Produto indisponível':stock<=5?`Últimas ${stock} unidades`:'Em estoque');
  const button:HTMLButtonElement=fixture.nativeElement.querySelector('.purchase-button');
  expect(button.disabled).toBe(stock===0);
  if(stock===0){button.click();fixture.componentInstance.addToCart();http.expectNone('http://localhost:8080/cart/items');expect(button.textContent).toContain('Produto indisponível');}
 }));
 it('limits additions by the units already in the cart and blocks duplicate requests', () => {
  product.stock = 5;
  const fixture = render([{ id: 1, productId: 42, name: 'Produto', quantity: 3, stock: 5, available: true }]);
  const page = fixture.componentInstance;
  expect(page.remainingStock()).toBe(2);
  page.quantity.set(3);
  page.addToCart();
  http.expectNone('http://localhost:8080/cart/items');
  page.quantity.set(2);
  page.addToCart();
  page.addToCart();
  const add = http.expectOne('http://localhost:8080/cart/items');
  expect(add.request.body).toEqual({ productId: 42, quantity: 2 });
  add.flush({ data: { items: [{ id: 1, productId: 42, name: 'Produto', quantity: 5, stock: 5, available: true }], totalItems: 5, total: 0 } });
  expect(page.canAddToCart()).toBeFalse();
  TestBed.inject(CustomAlertService).clearAll();
 });

 it('retries a temporary error and distinguishes a missing product', () => {
  const request = spyOn(TestBed.inject(CatalogService), 'getProductBySlug')
    .and.returnValues(throwError(() => new Error('offline')), of(null));
  const fixture = TestBed.createComponent(ProductDetailComponent);
  http.expectOne('http://localhost:8080/cart').flush({data:{items:[],totalItems:0,total:0}});
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar o produto');
  fixture.nativeElement.querySelector('.state button').click();
  fixture.detectChanges();
  expect(request).toHaveBeenCalledTimes(2);
  expect(fixture.nativeElement.textContent).toContain('Produto não encontrado');
 });

 it('shows registered towel sizes as descriptive measurements', async () => {
  product.name = 'Toalha de Banho Algodão Premium';
  product.measurements = { Solteiro: '160 x 220 cm', Queen: '240 x 260 cm', super_king: '260 x 280 cm', 'Dimensões': '70 x 140 cm' };
  const fixture = render();
  await fixture.whenStable();
  fixture.nativeElement.querySelectorAll('[role=tab]')[1].click();
  fixture.detectChanges();
  await fixture.whenStable();
  const info = fixture.nativeElement.querySelector('.product-description').textContent;
  expect(info).toContain('70 x 140 cm');
  const sizes = fixture.nativeElement.querySelector('.measurement-grid');
  expect(sizes.textContent).toContain('Queen');
  expect(sizes.textContent).toContain('Solteiro');
  expect(sizes.textContent).toContain('Super king');
  expect(sizes.querySelector('button')).toBeNull();
 });

 it('links the registered category and marks a long product name as the current page', () => {
  product.name = 'Toalha'.repeat(30);
  product.category = {id: 81, name: 'Toalhas', slug: 'toalhas'};
  const fixture = render();
  const nav = fixture.nativeElement.querySelector('app-breadcrumbs');
  expect(nav.querySelector('a[href="/home"]')).not.toBeNull();
  expect(nav.querySelector('a[href="/categoria/toalhas"]').textContent).toContain('Toalhas');
  expect(nav.querySelector('span[aria-current="page"]').textContent).toBe(product.name);
 });

 it('omits the category link and care list when their data is absent', () => {
  product.category = {id: 0, name: 'Produtos', slug: ''};
  product.care_instructions = '  ';
  const fixture = render();
  expect(fixture.nativeElement.querySelectorAll('app-breadcrumbs a').length).toBe(1);
  expect(fixture.nativeElement.querySelector('.product-care-list')).toBeNull();
 });

 it('renders registered care as list items and uses a neutral icon for free text', async () => {
  product.care_instructions = 'Ciclo delicado até 40°C;\nNão usar alvejante\nSecar à sombra\nConsultar etiqueta.';
  const fixture = render();
  await fixture.whenStable();
  fixture.nativeElement.querySelectorAll('[role=tab]')[2].click();
  fixture.detectChanges();
  await fixture.whenStable();
  const items: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.product-care');
  expect(Array.from(items, item => item.querySelector('svg')?.getAttribute('data-symbol'))).toEqual(['wash', 'bleach', 'dry', 'info']);
  expect(items[0].querySelector('p')?.textContent).toBe('Ciclo delicado até 40°C');
  expect(items[3].querySelector('p')?.textContent).toBe('Consultar etiqueta.');
 });

 it('blocks inactive products even with stock',()=>{
  product.status='inactive';const fixture=render();fixture.componentInstance.addToCart();
  expect(fixture.nativeElement.querySelector('.purchase-button').disabled).toBeTrue();http.expectNone('http://localhost:8080/cart/items');
 });
 ['Só temos 2 unidades disponíveis','Este produto ficou sem estoque'].forEach(message=>it(`shows backend conflict: ${message}`,()=>{
  const fixture=render();fixture.componentInstance.quantity.set(3);fixture.detectChanges();fixture.nativeElement.querySelector('.purchase-button').click();
  const request=http.expectOne('http://localhost:8080/cart/items');expect(request.request.body).toEqual({productId:42,quantity:3});
  request.flush({success:false,message},{status:409,statusText:'Conflict'});fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain(message);
  expect(fixture.componentInstance.cart.totalItems()).toBe(0);
  expect(fixture.componentInstance.stock()).toBe(10);
 }));

 it('renders the stored contents and the two Cama breadcrumb links', () => {
  product.category = { id: 81, name: 'Cama / Jogos de cama', slug: 'cama-jogos-de-cama--81' };
  product.measurements = { 'Conteúdo': '1 lençol + 2 fronhas', Cor: 'Oliva' };
  const fixture = render();
  const contents = [...fixture.nativeElement.querySelectorAll('.included-items li')].map(item => (item as HTMLElement).textContent);
  expect(contents).toEqual(['1 lençol', '2 fronhas']);
  expect(fixture.nativeElement.querySelector('app-breadcrumbs a[href="/categoria/cama"]').textContent).toContain('Cama');
  expect(fixture.nativeElement.querySelector('app-breadcrumbs a[href="/categoria/cama-jogos-de-cama--81"]').textContent).toContain('Jogos de cama');
 });

 it('validates, submits and displays a masked postal code quote', async () => {
  const fixture = render();
  await fixture.whenStable();
  const form = fixture.nativeElement.querySelector('app-shipping-quote form');
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('#quote-cep').getAttribute('aria-invalid')).toBe('true');
  const input = fixture.nativeElement.querySelector('#quote-cep');
  input.value = '87502-100';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  const request = http.expectOne(r => r.url.endsWith('/shipping/quote') && r.params.get('cep') === '87502100');
  request.flush({ priceCents: 1390, minDays: 2, maxDays: 3 });
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.result').textContent).toContain('Entrega disponível');

  form.dispatchEvent(new Event('submit', { cancelable: true }));
  http.expectOne(r => r.url.endsWith('/shipping/quote')).flush({}, { status: 404, statusText: 'Not Found' });
  http.expectOne('https://viacep.com.br/ws/87502100/json/').flush({ localidade: 'Umuarama' });
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('app-shipping-quote').textContent).toContain('Entrega indisponível');
  expect(fixture.nativeElement.querySelector('#quote-cep-error')).toBeNull();

  form.dispatchEvent(new Event('submit', { cancelable: true }));
  http.expectOne(r => r.url.endsWith('/shipping/quote')).error(new ProgressEvent('error'));
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('app-shipping-quote').textContent).toContain('Não foi possível calcular');
  expect(fixture.nativeElement.querySelector('#quote-cep-error')).toBeNull();
 });

 it('updates the selected size, price, stock, images, kit and the variant sent to cart', () => {
  product.variants = [
   { id: 31, size: 'Casal', price: 129.9, stock: 4, includedItems: ['1 lençol'] },
   { id: 32, size: 'Queen', price: 149.9, stock: 2, dimensions: '160 × 200 cm', includedItems: ['1 lençol', '2 fronhas'],
     images: [{ id: 32, url: '/queen.webp', alt: 'Queen', position: 0 }] },
   { id: 33, size: 'King', price: 179.9, stock: 0 },
  ];
  const fixture = render([{id: 11, productId: 42, variantId: 31, name: 'Produto — Casal', stock: 4, quantity: 1}]);
  const page = fixture.componentInstance;
  expect(page.remainingStock()).toBe(3);
  page.selectSize('King');
  expect(page.selectedVariant()?.id).toBe(31);
  page.selectSize('Queen');
  fixture.detectChanges();
  expect(page.selectedPrice()).toBe(149.9);
  expect(page.remainingStock()).toBe(2);
  expect(page.galleryImages()[0].alt).toBe('Queen');
  expect(fixture.nativeElement.querySelector('.included-items').textContent).toContain('2 fronhas');
  expect(fixture.nativeElement.textContent).toContain('160 × 200 cm');
  page.addToCart();
  const request = http.expectOne('http://localhost:8080/cart/items');
  expect(request.request.body).toEqual({productId: 42, quantity: 1, variantId: 32});
  request.flush({data: {items: [], totalItems: 0, total: 0}});
  TestBed.inject(CustomAlertService).clearAll();
 });
});
