import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  const url = 'http://localhost:8080/admin/dashboard';
  beforeEach(() => TestBed.configureTestingModule({
    imports: [DashboardComponent],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('shows loading, offers retry and renders the empty catalog', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.skeleton').length).toBe(4);
    http.expectOne(url).flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    http.expectOne(url).flush({ orders: 0, products: 0, lowStock: 0, revenueCents: 0, months: [], categories: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.metric').length).toBe(4);
    expect(fixture.nativeElement.textContent).toContain('Nenhum pedido registrado');
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/admin/products/manage');
  });

  it('renders orders and units sold from the API', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    TestBed.inject(HttpTestingController).expectOne(url).flush({
      orders: 2, products: 3, lowStock: 1, revenueCents: 2000,
      months: [{ month: '2026-01', total: 2, cancelled: 1 }], categories: [{ name: 'Cama', units: 4 }],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('2 · 1 cancelados');
    expect(fixture.nativeElement.textContent).toContain('4 un.');
  });
});