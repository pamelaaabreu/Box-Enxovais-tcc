import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { FeaturedProductsComponent } from './featured-products.component';

describe('FeaturedProductsComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: CartService,
          useValue: {
            pending: signal(new Set()),
            cart: () => ({ items: [] }),
            feedback: signal({}),
            add: jasmine.createSpy('add'),
          },
        },
        {
          provide: FavoritesService,
          useValue: {
            authenticated: signal(false),
            synchronized: signal(true),
            pending: signal(new Set()),
            loading: signal(false),
            errors: signal({}),
            syncError: signal(''),
            isFavorite: () => false,
            toggle: jasmine.createSpy('toggle'),
          },
        },
      ],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('loads an independent four-product showcase and links to the existing complete catalog', () => {
    const fixture = TestBed.createComponent(FeaturedProductsComponent);
    fixture.componentRef.setInput('titulo', 'Produtos em destaque');
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    const request = http.expectOne('http://localhost:8080/home/featured');
    expect(
      fixture.nativeElement.querySelector('[role="status"]'),
    ).not.toBeNull();
    request.flush({
      products: Array.from({ length: 4 }, (_, i) => ({
        id: i + 1,
        name: 'Produto ' + i,
        price: 100,
        quantity: 8,
        status: 'active',
        measurements: {},
        promotional_price: 0,
      })),
    });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('app-product-card').length).toBe(4);
    expect(root.querySelector('.featured-heading p')?.textContent).toBe(
      'Escolhas especiais para trazer mais conforto ao seu lar.',
    );
    expect(root.querySelector('.all-products')?.getAttribute('href')).toBe(
      '/categoria/todos',
    );
    http.expectNone('http://localhost:8080/home/highlights');
  });
  it('keeps the API error and retry functional without fabricated products', () => {
    const fixture = TestBed.createComponent(FeaturedProductsComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('http://localhost:8080/home/featured')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[role="alert"]'),
    ).not.toBeNull();
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    http
      .expectOne('http://localhost:8080/home/featured')
      .flush({ products: [] });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelectorAll('app-product-card').length,
    ).toBe(0);
    expect(fixture.nativeElement.textContent).toContain(
      'Nenhum produto disponível',
    );
  });
});
