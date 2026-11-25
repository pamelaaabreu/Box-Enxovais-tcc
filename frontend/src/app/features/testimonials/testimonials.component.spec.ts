import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting,HttpTestingController } from '@angular/common/http/testing';
import { TestimonialsComponent } from './testimonials.component';
describe('Product testimonials',()=>{
 beforeEach(()=>TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting()]}));afterEach(()=>TestBed.inject(HttpTestingController).verify());
 it('hides the section when there are no eligible reviews',()=>{const fixture=TestBed.createComponent(TestimonialsComponent);TestBed.inject(HttpTestingController).expectOne('http://localhost:8080/home/product-reviews').flush([]);fixture.detectChanges();expect(fixture.nativeElement.querySelector('section')).toBeNull();});
 it('renders real customer and product data from the API',()=>{const fixture=TestBed.createComponent(TestimonialsComponent);TestBed.inject(HttpTestingController).expectOne('http://localhost:8080/home/product-reviews').flush([{id:1,productId:7,productName:'Edredom Floral',rating:5,comment:'Excelente qualidade',customerName:'Ana S.'}]);fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('Quem comprou, recomenda');expect(fixture.nativeElement.textContent).toContain('Ana S.');expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/produto/edredom-floral-7');});
});
