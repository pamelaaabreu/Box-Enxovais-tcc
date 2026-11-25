import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ShopByCategoryComponent } from './shop-by-category.component';

const categories = [
  { name: 'Cama', slug: 'cama' },
  { name: 'Travesseiros', slug: 'travesseiros' },
  { name: 'Toalhas', slug: 'toalhas' },
  { name: 'Almofadas', slug: 'almofadas' },
  { name: 'Mesa', slug: 'mesa' },
  { name: 'Decoração', slug: 'decoracao' },
].map((category) => ({
  ...category,
  imagePath: 'uploads/' + category.slug + '.webp',
}));

describe('ShopByCategoryComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('keeps the six category routes and photographs with accessible names inside each image card', () => {
    const fixture = TestBed.createComponent(ShopByCategoryComponent);
    fixture.componentRef.setInput('titulo', 'Compre por Categoria');
    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:8080/home/categories')
      .flush(categories);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h2')?.textContent).toBe('Compre por Categoria');
    expect(root.querySelector('.category-heading p')?.textContent).toBe(
      'Descubra nossas coleções e transforme cada ambiente da sua casa.',
    );
    const cards = [
      ...root.querySelectorAll<HTMLAnchorElement>('.category-card'),
    ];
    expect(cards.length).toBe(6);
    cards.forEach((card, i) => {
      expect(card.getAttribute('href')).toBe(
        '/categoria/' + categories[i].slug,
      );
      expect(card.getAttribute('aria-label')).toBe(
        'Explorar categoria ' + categories[i].name,
      );
      expect(
        card.querySelector('.category-caption .category-name')?.textContent,
      ).toBe(categories[i].name);
      expect(card.querySelector('img')?.getAttribute('src')).toBe(
        'http://localhost:8080/' + categories[i].imagePath,
      );
      expect(card.querySelector('img')?.alt).toBe('');
      expect(card.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
        'true',
      );
    });
  });
  it('does not invent categories or images when the API is unavailable', () => {
    const fixture = TestBed.createComponent(ShopByCategoryComponent);
    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:8080/home/categories')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelectorAll('.category-card').length,
    ).toBe(0);
  });
});
