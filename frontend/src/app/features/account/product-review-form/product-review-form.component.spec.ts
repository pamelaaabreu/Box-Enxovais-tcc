import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting,HttpTestingController } from '@angular/common/http/testing';
import { ProductReviewFormComponent } from './product-review-form.component';
describe('ProductReviewFormComponent',()=>{
 beforeEach(()=>TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]}));afterEach(()=>TestBed.inject(HttpTestingController).verify());
 it('rejects invalid ratings and preserves entered values after a failure',()=>{
  const fixture=TestBed.createComponent(ProductReviewFormComponent);fixture.componentRef.setInput('product',{productId:1,productName:'Produto',imagePath:''});fixture.detectChanges();const component=fixture.componentInstance;component.submit();expect(component.form.invalid).toBeTrue();const http=TestBed.inject(HttpTestingController);http.expectNone('http://localhost:8080/products/1/reviews');component.form.patchValue({rating:5,comment:'Minha opinião'});component.submit();http.expectOne('http://localhost:8080/products/1/reviews').flush({}, {status:500,statusText:'Error'});expect(component.form.controls.comment.value).toBe('Minha opinião');expect(component.saving()).toBeFalse();expect(component.error()).toContain('Não foi possível');
 });
});
