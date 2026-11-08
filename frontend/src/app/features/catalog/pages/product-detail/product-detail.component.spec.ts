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
import { of } from 'rxjs';
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
      { provide: CartService, useValue: {} },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ slug: 'produto' })) } },
      { provide: CatalogService, useValue: { getProductBySlug: () => of(product) } },
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
  TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),
   {provide:AuthService,useValue:{getToken:()=> 'test',userChanged:new Subject<void>()}},
   {provide:CatalogService,useValue:{getProductBySlug:()=>of(product)}},
  ]});
  TestBed.overrideComponent(ProductDetailComponent,{remove:{imports:[CatalogLayoutComponent]},add:{imports:[TestProductLayout]}});
  http=TestBed.inject(HttpTestingController);
 });
 afterEach(()=>http.verify());
 function render(){
  const fixture=TestBed.createComponent(ProductDetailComponent);
  http.expectOne('http://localhost:8080/cart').flush({data:{items:[],totalItems:0,total:0}});
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
});
