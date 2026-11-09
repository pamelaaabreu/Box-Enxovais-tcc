import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CatalogLayoutComponent } from '../catalog/components/catalog-layout/catalog-layout.component';
import { OrderHistoryComponent } from './order-history.component';

describe('OrderHistoryComponent', () => {
  const url = 'http://localhost:8080/orders?page=1';
  function setup(id?: string) {
    const userChanged = new Subject<void>();
    TestBed.configureTestingModule({
      imports: [OrderHistoryComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: AuthService, useValue: { userChanged } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap(id ? {id} : {})) } },
      ],
    }).overrideComponent(OrderHistoryComponent, {
      remove: { imports: [CatalogLayoutComponent] },
      add: { schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(OrderHistoryComponent);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    const http = TestBed.inject(HttpTestingController);
    return { fixture, page, http, navigate, userChanged };
  }

  it('renders loading before the empty state and links back to the store', () => {
    const { fixture, page, http } = setup();
    expect(page.querySelectorAll('.skeleton').length).toBe(2);
    expect(page.querySelector('.empty')).toBeNull();
    http.expectOne({ url, method: 'GET' }).flush({ data: { orders: [], hasMore: false } });
    fixture.detectChanges();
    expect(page.querySelector('.empty a')?.getAttribute('href')).toBe('/home');
    expect(page.querySelector('app-catalog-layout')?.classList.contains('order-history-surface')).toBeTrue();
    http.verify();
  });

  it('retries a network failure and links the returned order to its details', () => {
    const { fixture, page, http } = setup();
    http.expectOne({ url, method: 'GET' }).error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(page.querySelector('[role="alert"]')).not.toBeNull();
    page.querySelector('button')!.click();
    http.expectOne({ url, method: 'GET' }).flush({ data: { orders: [{
      id: 9, createdAt: '2025-01-02T15:00:00Z', status: 'simulated_approved', total: 25,
      items: [{ id: 3, name: 'Toalha', quantity: 2, unitPrice: 12.5, image: '' }],
    }, {
      id: 8, createdAt: '2025-01-01T15:00:00Z', total: 30,
      items: ['Manta', 'Lençol', 'Fronha', 'Capa'].map((name, id) => ({ id: id + 4, name, quantity: 1, unitPrice: 7.5, image: '' })),
    }], hasMore: true } });
    fixture.detectChanges();
    const cards = page.querySelectorAll('.orders-grid .order-preview');
    expect(cards.length).toBe(2);
    expect(cards[0].querySelectorAll('li').length).toBe(1);
    expect(cards[0].textContent).toContain('Toalha');
    expect(cards[0].textContent).toContain('12,50');
    expect(cards[0].querySelector('footer')?.textContent).toContain('25,00');
    expect(cards[1].querySelectorAll('li').length).toBe(4);
    expect(cards[1].querySelector('footer')?.textContent).toContain('(4 itens)');
    expect(cards[1].textContent).toContain('Fronha');
    expect(page.textContent).not.toContain('Aprovado em simulação');
    expect(page.querySelector('.order a')?.getAttribute('href')).toBe('/meus-pedidos/9');
    page.querySelectorAll('nav button')[1].dispatchEvent(new MouseEvent('click'));
    http.expectOne('http://localhost:8080/orders?page=2').flush({ data: { orders: [], hasMore: false } });
    http.verify();
  });

  it('keeps filters across pages, resets the page on changes and clears empty results', () => {
    const { fixture, page, http } = setup();
    const result = { data: { orders: [], hasMore: true } };
    http.expectOne(url).flush(result);
    fixture.componentInstance.movePage(1);
    http.expectOne('http://localhost:8080/orders?page=2').flush(result);

    fixture.componentInstance.updateFilters('sort', 'oldest');
    http.expectOne(url + '&sort=oldest').flush(result);
    fixture.componentInstance.movePage(1);
    http.expectOne('http://localhost:8080/orders?page=2&sort=oldest').flush(result);

    fixture.componentInstance.movePage(-1);
    const obsolete = http.expectOne(url + '&sort=oldest');
    fixture.componentInstance.updateFilters('period', 'custom');
    fixture.componentInstance.updateFilters('dateFrom', '2026-11-01');
    expect(obsolete.cancelled).toBeTrue();
    http.expectNone(request => request.url.includes('/orders'));
    fixture.componentInstance.updateFilters('dateTo', '2026-11-09');
    fixture.detectChanges();
    expect(page.querySelectorAll('mat-select[role="combobox"]').length).toBe(2);
    expect(page.querySelectorAll('.skeleton').length).toBe(2);
    expect(page.textContent).not.toContain('Nenhum pedido encontrado');
    http.expectOne(url + '&sort=oldest&dateFrom=2026-11-01&dateTo=2026-11-09')
      .flush({ data: { orders: [], hasMore: false } });
    fixture.detectChanges();
    expect(page.textContent).toContain('Nenhum pedido encontrado');
    page.querySelector<HTMLButtonElement>('.clear-filters')!.click();
    http.expectOne(url).flush({ data: { orders: [], hasMore: false } });
    fixture.detectChanges();
    expect(page.querySelector('.empty')).not.toBeNull();
    http.verify();
  });
  it('opens both Material overlays and reloads when an option is selected', async () => {
    const { fixture, page, http } = setup();
    http.expectOne(url).flush({ data: { orders: [], hasMore: false } });
    fixture.detectChanges();

    const loader = TestbedHarnessEnvironment.loader(fixture);
    const [sort, period] = await loader.getAllHarnesses(MatSelectHarness);
    expect(page.querySelector('select')).toBeNull();
    await sort.open();
    const panel = document.querySelector('.cdk-overlay-pane .order-history-filter-panel');
    expect(panel?.querySelector('.mdc-list-item--selected')?.textContent).toContain('Mais recentes');
    expect(getComputedStyle(panel!.querySelector('.mdc-list-item--selected')!).backgroundColor)
      .toBe('rgb(238, 240, 233)');
    await sort.clickOptions({ text: 'Mais antigos' });
    expect(await sort.isOpen()).toBeFalse();
    expect(page.querySelectorAll('.skeleton').length).toBe(2);

    const previous = http.expectOne(url + '&sort=oldest');
    await period.open();
    expect((await period.getOptions()).length).toBe(4);
    await period.clickOptions({ text: 'Personalizado' });
    expect(previous.cancelled).toBeTrue();
    expect(page.querySelectorAll('input[type="date"]').length).toBe(2);
    http.expectNone(request => request.url.includes('/orders'));
    http.verify();
  });

  it('renders persisted order details', () => {
    const { fixture, page, http } = setup('9');
    http.expectOne('http://localhost:8080/orders/9').flush({ data: {
      id: 9, createdAt: '2025-01-02T15:00:00Z', total: 25, paymentMethod: 'pix',
      address: { recipient: 'Cliente teste', street: 'Rua Teste', number: '3', city: 'São Paulo', state: 'SP' },
      items: [{ id: 3, name: 'Toalha', quantity: 2, unitPrice: 12.5, subtotal: 25, image: '' }],
    } });
    fixture.detectChanges();
    expect(page.textContent).toContain('Toalha');
    expect(page.textContent).toContain('12,50');
    expect(page.textContent).toContain('25,00');
    expect(page.textContent).toContain('Cliente teste');
    expect(page.textContent).toContain('Pix');
    http.verify();
  });

  it('shows not found for a 404 with no order data', () => {
    const { fixture, page, http } = setup('9');
    http.expectOne('http://localhost:8080/orders/9').flush(null, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(page.textContent).toContain('Pedido não encontrado');
    expect(page.querySelector('.detail-grid')).toBeNull();
    http.verify();
  });

  it('cancels the request and leaves the page when the account changes', () => {
    const { http, navigate, userChanged } = setup();
    const request = http.expectOne(url);
    userChanged.next();
    expect(request.cancelled).toBeTrue();
    expect(navigate).toHaveBeenCalledOnceWith(['/login']);
    http.verify();
  });
});
