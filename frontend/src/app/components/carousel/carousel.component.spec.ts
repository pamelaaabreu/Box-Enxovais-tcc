import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CarouselComponent } from './carousel.component';

describe('Home carousel',()=>{
 it('renders exactly three approved photographs with editable short copy and category links',()=>{
  TestBed.configureTestingModule({providers:[provideRouter([])]});
  const fixture=TestBed.createComponent(CarouselComponent);fixture.detectChanges();
  const root=fixture.nativeElement as HTMLElement;
  expect(root.querySelectorAll('.carousel-item').length).toBe(3);
  expect([...root.querySelectorAll('.banner__title')].map(e=>e.getAttribute('aria-label'))).toEqual(['Um Natal cheio de aconchego','Seu momento de bem-estar','Detalhes que transformam']);
  expect([...root.querySelectorAll('.banner__eyebrow')].map(e=>e.textContent?.trim())).toEqual(['Coleção Natal','Coleção Banho','Coleção Almofadas']);
  expect(root.querySelectorAll('.banner__title em').length).toBe(3);
  expect(root.querySelectorAll('.banner__subtitle').length).toBe(0);
  expect(root.querySelectorAll('.banner__description').length).toBe(3);
  expect([...root.querySelectorAll('.banner__button')].map(e=>e.getAttribute('href'))).toEqual(['/categoria/cama','/categoria/toalhas','/categoria/almofadas']);
  expect(root.querySelector('.carousel')?.getAttribute('data-bs-interval')).toBe('8000');
  expect(root.querySelectorAll('.carousel-indicators button').length).toBe(3);
  expect([...root.querySelectorAll('.carousel-indicators button')].map(e=>e.getAttribute('aria-label'))).toEqual(['Banner de Natal','Banner de Banho','Banner de Almofadas']);
  expect([...root.querySelectorAll('.banner__button')].map(e=>e.textContent?.replace('→','').trim())).toEqual(['Explorar coleção','Ver toalhas','Ver almofadas']);
  expect([...root.querySelectorAll('.banner__image')].map(e=>e.getAttribute('src'))).toEqual(['/home/banner-natal.webp','/home/banner-banho-fotografico.webp','/home/banner-almofadas-fotografico.webp']);
  expect(root.querySelector('app-trust-bar')).toBeNull();
  expect(root.querySelectorAll('.banner__christmas-detail').length).toBe(0);
  expect(root.querySelectorAll('.banner__button svg[aria-hidden="true"]').length).toBe(3);
  expect(root.querySelectorAll('.banner__button--light').length).toBe(2);
  expect(root.querySelector('.banner--natal .banner__button--light')).toBeNull();
 });
});
