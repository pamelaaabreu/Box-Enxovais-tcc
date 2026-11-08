import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { CatalogService } from './catalog.service';
import { ProductService } from '../../../core/services/product.service';

describe('CatalogService API mapping',()=>{
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
