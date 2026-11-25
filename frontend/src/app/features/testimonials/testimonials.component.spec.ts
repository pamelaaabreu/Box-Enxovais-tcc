import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestimonialsComponent } from './testimonials.component';
describe('Product testimonials', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('hides the section when there are no eligible reviews', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestimonialsComponent);
    tick(0);
    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:8080/home/reviews')
      .flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
    fixture.destroy();
  }));
  it('renders real customer and product data from the API', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestimonialsComponent);
    tick(0);
    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:8080/home/reviews')
      .flush([
        {
          id: 1,
          productId: 7,
          productName: 'Edredom Floral',
          overall: 5,
          comment: 'Excelente qualidade',
          customerName: 'Ana S.',
        },
      ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Quem comprou, recomenda',
    );
    expect(fixture.nativeElement.textContent).toContain('Cliente verificado');
    expect(fixture.nativeElement.textContent).not.toContain('Ana S.');
    fixture.destroy();
  }));
});
