import { variantForm } from '../../../shared/components/product-variants/product-variants.component';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController,provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute,convertToParamMap,provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProductVariantsPageComponent } from './product-variants-page.component';
import { CustomAlertService } from '../../../core/services/custom-alert.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
describe('ProductVariantsPageComponent',()=>{
 beforeEach(()=>TestBed.configureTestingModule({imports:[ProductVariantsPageComponent],providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),{provide:ActivatedRoute,useValue:{snapshot:{paramMap:convertToParamMap({id:'12'})}}},{provide:CustomAlertService,useValue:{success:jasmine.createSpy(),error:jasmine.createSpy()}},{provide:ConfirmDialogService,useValue:{open:()=>({afterClosed:()=>of(false)})}}]}));
 afterEach(()=>TestBed.inject(HttpTestingController).verify());
 it('saves existing IDs with an original stock snapshot and preserves edits on conflicts',()=>{
  const fixture=TestBed.createComponent(ProductVariantsPageComponent),http=TestBed.inject(HttpTestingController),page=fixture.componentInstance;
  const original={id:31,size:'Queen',dimensions:'240 × 260 cm',price:329.90,stock:3};http.expectOne('http://localhost:8080/products/12').flush({id:12,name:'Edredom',sku:'BX-EDR-012',price:329.90,quantity:3,variants:[original]});
  page.variants.at(0).controls.price.setValue('349,90');page.form.markAsDirty();page.save();let req=http.expectOne('http://localhost:8080/admin/products/12/variants');expect(req.request.method).toBe('PUT');expect(req.request.body.variants[0].id).toBe(31);expect(req.request.body.expected_variants[0].stock).toBe(3);req.flush({message:'Estoque atualizado; recarregue.'},{status:409,statusText:'Conflict'});expect(page.error).toContain('recarregue');expect(page.variants.at(0).controls.price.value).toBe('349,90');
  page.save();req=http.expectOne('http://localhost:8080/admin/products/12/variants');req.flush({variants:[{...original,price:349.90}]});expect(page.form.pristine).toBeTrue();expect(page.expected[0].price).toBe(349.90);
 });
 it('loads simple values, preserves them while toggling and sends them only without variations',()=>{
  const fixture=TestBed.createComponent(ProductVariantsPageComponent),http=TestBed.inject(HttpTestingController),page=fixture.componentInstance;
  http.expectOne('http://localhost:8080/products/12').flush({id:12,name:'Manta',price:89.90,quantity:7,variants:[]});expect(page.form.controls.price.value).toBe('89,90');expect(page.form.controls.quantity.value).toBe(7);
  page.variants.push(variantForm({id:0,size:'Queen',dimensions:'240 × 260 cm',price:329.90,stock:3}));expect(page.form.controls.price.disabled).toBeTrue();page.variants.clear();expect(page.form.controls.price.value).toBe('89,90');expect(page.form.controls.price.enabled).toBeTrue();
  page.form.controls.price.setValue('99,90');page.form.markAsDirty();page.save();const req=http.expectOne('http://localhost:8080/admin/products/12/variants');expect(req.request.body.commerce).toEqual({price:99.90,quantity:7,expected_price:89.90,expected_quantity:7});req.flush({variants:[]});expect(page.form.pristine).toBeTrue();
 });

});
