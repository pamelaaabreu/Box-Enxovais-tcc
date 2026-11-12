import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { CatalogService } from './catalog.service';
import { ProductService } from '../../../core/services/product.service';

describe('CatalogService API mapping',()=>{
 it('resolves a database category and lists its products by ID', async () => {
  const getProductsPage = jasmine.createSpy('getProductsPage').and.returnValue(of({items: []}));
  TestBed.configureTestingModule({providers:[{provide:ProductService,useValue:{
    getProductTypes: () => of([{id: 81, name: 'Toalhas'}, {id: 82, name: 'Roupa de banho'}]),
    getProductsPage,
  }}]});
  const service = TestBed.inject(CatalogService);
  const category = await firstValueFrom(service.getCategoryBySlug('toalhas'));
  expect(category).toEqual(jasmine.objectContaining({id: 81, name: 'Toalhas'}));
  const product = service.adapt({id: 10, name: 'Roupão', category_name: 'Roupa de banho', product_type_id: 82} as Parameters<CatalogService['adapt']>[0]);
  expect(await firstValueFrom(service.getCategoryBySlug(product.category.slug))).toEqual(product.category);
  await firstValueFrom(service.getCategoryPage(category!, {limit: 12}));
  expect(getProductsPage).toHaveBeenCalledWith({limit: 12, filters: {product_type_id: 81}});
  expect(await firstValueFrom(service.getCategoryBySlug('inexistente'))).toBeNull();
 });

 it('resolves Cama to exact group members and keeps the catalog filters', async () => {
  const getProductsPage = jasmine.createSpy('getProductsPage').and.returnValue(of({ items: [] }));
  TestBed.configureTestingModule({ providers: [{ provide: ProductService, useValue: {
    getProductTypes: () => of([
      { id: 90, name: 'Cama / Edredons' },
      { id: 32, name: 'Cama / Jogos de cama' },
      { id: 13, name: 'Cama / Outro' },
    ]),
    getProductsPage,
  } }] });
  const service = TestBed.inject(CatalogService);
  const group = (await firstValueFrom(service.getCategoryBySlug('cama')))!;
  expect(group.children?.map(child => child.id)).toEqual([32, 90]);
  await firstValueFrom(service.getCategoryPage(group, { limit: 12, filters: { sort: 'name' } }));
  expect(getProductsPage).toHaveBeenCalledWith({ limit: 12, filters: { product_type_ids: '32,90', sort: 'name' } });
  const empty = await firstValueFrom(service.getCategoryPage({ ...group, children: [] }, {}));
  expect(empty.pagination.total).toBe(0);
  expect(getProductsPage).toHaveBeenCalledTimes(1);
 });

 it('uses real IDs, category names and stock without mock variants',async()=>{
  const product={id:42,name:'Jogo de cama',category_name:'Cama',status:'active',price:129.9,quantity:4,image_paths:[]};
  TestBed.configureTestingModule({providers:[{provide:ProductService,useValue:{getProducts:()=>of([product]),getProduct:(id:number)=>{expect(id).toBe(42);return of(product)}}}]});
  const service=TestBed.inject(CatalogService);
  const products=await firstValueFrom(service.getProductsByCategory('cama'));
  expect(products[0].id).toBe(42);expect(products[0].variants).toEqual([]);
  expect((await firstValueFrom(service.getProductBySlug(products[0].slug)))?.id).toBe(42);
  expect(await firstValueFrom(service.getProductBySlug('inexistente'))).toBeNull();
 });
});
