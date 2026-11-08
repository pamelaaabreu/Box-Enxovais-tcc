import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { PromoGridComponent } from './promo-grid.component';
import { PromoService } from '../../core/services/promo.service';
import { AuthService } from '../../core/services/auth.service';
import { Product } from '../../shared/models';

describe('Winter offers cart interaction', () => {
  let fixture: ComponentFixture<PromoGridComponent>;
  let http: HttpTestingController;
  let token: string | null;
  let product: Product;
  const snapshot = (quantity: number) => ({ items: quantity ? [{ id: 9, productId: 42, name: 'Cama', image: '', quantity, stock: 5, available: true, unitPrice: 80, subtotal: 80 * quantity }] : [], totalItems: quantity, total: 80 * quantity });
  const button = (): HTMLButtonElement => fixture.nativeElement.querySelector('.add-cart-btn');
  function addOne(): void {
    button().click();
    http.expectOne('http://localhost:8080/cart/items').flush({ data: snapshot(1) });
    fixture.detectChanges();
  }
  const plus = (): HTMLButtonElement => fixture.nativeElement.querySelector('.quantity-increase');
  const minus = (): HTMLButtonElement => fixture.nativeElement.querySelector('.quantity-decrease');
  const count = () => fixture.nativeElement.querySelector('.quantity-count').textContent.trim();
  beforeEach(() => {
    token = 'test-session';
    product = { id: 42, name: 'Cama', price: 100, promotional_price: 80, quantity: 5, status: 'active', measurements: {} };
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
      { provide: AuthService, useValue: { getToken: () => token, userChanged: new Subject<void>() } },
      { provide: PromoService, useValue: { getPromotionalProducts: () => of([product]) } },
    ] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PromoGridComponent);
    fixture.componentRef.setInput('promoName', 'Ofertas de Inverno');
    http.expectOne('http://localhost:8080/cart').flush({ data: snapshot(0) });
    fixture.detectChanges();
    http.expectOne(r => r.url === 'http://localhost:8080/favorites').flush({items:[],pagination:{offset:0,limit:100,total:0,hasMore:false}});
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  it('adds once and changes into a counter using the confirmed cart quantity', () => {
    button().click(); fixture.componentInstance.addToCart(product);
    const req = http.expectOne('http://localhost:8080/cart/items');
    expect(req.request.body).toEqual({ productId: 42, quantity: 1 });
    fixture.detectChanges(); expect(button().disabled).toBeTrue();
    req.flush({ data: snapshot(1) }); fixture.detectChanges();
    expect(count()).toBe('1'); expect(button()).toBeNull();
    plus().click(); fixture.componentInstance.changeQuantity(product, 1);
    const update = http.expectOne('http://localhost:8080/cart/items/9');
    expect(update.request.method).toBe('PATCH'); expect(update.request.body).toEqual({ quantity: 2 });
    fixture.detectChanges(); expect(plus().disabled).toBeTrue(); expect(minus().disabled).toBeTrue();
    expect(count()).toBe('1');
    update.flush({ data: snapshot(2) }); fixture.detectChanges();
    expect(count()).toBe('2'); expect(fixture.componentInstance.cart.totalItems()).toBe(2);
    minus().click();
    http.expectOne('http://localhost:8080/cart/items/9').flush({ data: snapshot(1) }); fixture.detectChanges();
    expect(count()).toBe('1');
    minus().click();
    const removal = http.expectOne('http://localhost:8080/cart/items/9');
    expect(removal.request.method).toBe('DELETE');
    removal.flush({ data: snapshot(0) }); fixture.detectChanges();
    expect(button()).not.toBeNull(); expect(fixture.componentInstance.cart.totalItems()).toBe(0);
  });
  it('keeps the real quantity and shows backend errors for updates and removals', () => {
    addOne(); plus().click();
    http.expectOne('http://localhost:8080/cart/items/9').flush({ message: 'Este produto ficou sem estoque' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges(); expect(count()).toBe('1');
    expect(fixture.nativeElement.textContent).toContain('Este produto ficou sem estoque');
    expect(minus().disabled).toBeFalse();
    minus().click();
    http.expectOne('http://localhost:8080/cart/items/9').error(new ProgressEvent('error'));
    fixture.detectChanges(); expect(count()).toBe('1'); expect(fixture.nativeElement.textContent).toContain('Sem conexão');
  });
  it('syncs existing cart state and blocks increases at the stock limit', () => {
    fixture.componentInstance.cart.load();
    http.expectOne('http://localhost:8080/cart').flush({ data: snapshot(5) }); fixture.detectChanges();
    expect(count()).toBe('5'); expect(plus().disabled).toBeTrue(); expect(minus().disabled).toBeFalse();
    fixture.componentInstance.changeQuantity(product, 1);
    http.expectNone('http://localhost:8080/cart/items/9');
    fixture.componentInstance.cart.clear();
    http.expectOne('http://localhost:8080/cart').flush({ data: snapshot(0) }); fixture.detectChanges();
    expect(button()).not.toBeNull();
  });
  it('blocks unavailable products but lets customers remove existing items', () => {
    addOne(); product.status = 'inactive'; fixture.detectChanges();
    expect(plus().disabled).toBeTrue(); expect(minus().disabled).toBeFalse();
    minus().click(); http.expectOne('http://localhost:8080/cart/items/9').flush({ data: snapshot(0) });
    fixture.detectChanges(); expect(button().disabled).toBeTrue();
  });
  it('does not show negative discounts or an inflated promotional price', () => {
    product.price = 45; product.promotional_price = 66; fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.badge')).toBeNull();
    expect(fixture.nativeElement.querySelector('.original-price')).toBeNull();
    expect(fixture.nativeElement.querySelector('.promo-price').textContent).toContain('45.00');
  });
  it('navigates to login when there is no session', () => {
    token = null;
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    button().click(); expect(navigate).toHaveBeenCalledWith(['/login']);
    http.expectNone('http://localhost:8080/cart/items');
  });
});
