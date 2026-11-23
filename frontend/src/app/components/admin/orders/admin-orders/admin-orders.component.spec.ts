import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { AdminOrdersComponent } from './admin-orders.component';
import { AdminOrdersService, AdminOrderPage } from '../services/admin-orders.service';
describe('AdminOrdersComponent', () => {
  let query: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let api: jasmine.SpyObj<AdminOrdersService>;
  beforeEach(() => {
    query = new BehaviorSubject(convertToParamMap({}));
    api = jasmine.createSpyObj('orders', ['list']);
    api.list.and.returnValue(
      of({ orders: [], total: 0, approved: 0, cancelled: 0 }),
    );
    TestBed.configureTestingModule({
      imports: [AdminOrdersComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: query } },
        { provide: AdminOrdersService, useValue: api },
      ],
    });
  });
  it('restores URL filters and loads only the requested server page', () => {
    query.next(
      convertToParamMap({ page: '2', search: 'Ana', status: 'cancelled' }),
    );
    const fixture = TestBed.createComponent(AdminOrdersComponent);
    fixture.detectChanges();
    expect(api.list).toHaveBeenCalledWith({
      page: 2,
      search: 'Ana',
      status: 'cancelled',
    });
    expect(fixture.componentInstance.filters.controls.search.value).toBe('Ana');
  });
  it('returns to the first page when applying filters', () => {
    const c = TestBed.createComponent(AdminOrdersComponent).componentInstance;
    const nav = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    c.filters.controls.search.setValue('Bruno');
    c.apply();
    expect(nav.calls.mostRecent().args[1]?.queryParams?.['page']).toBe(1);
  });
  it('cancels obsolete requests so slow responses cannot replace newer results', () => {
    const first = new Subject<AdminOrderPage>();
    api.list.and.returnValue(first);
    const c = TestBed.createComponent(AdminOrdersComponent).componentInstance;
    api.list.and.returnValue(
      of({ orders: [], total: 7, approved: 7, cancelled: 0 }),
    );
    query.next(convertToParamMap({ search: 'novo' }));
    first.next({ orders: [], total: 99, approved: 99, cancelled: 0 });
    expect(c.data().total).toBe(7);
  });
  it('renders the shared empty state and one page header', () => {
    const fixture = TestBed.createComponent(AdminOrdersComponent);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelectorAll('app-admin-page-header').length,
    ).toBe(1);
    expect(fixture.nativeElement.textContent).toContain(
      'Nenhum pedido encontrado',
    );
  });
  it('renders the shared error state and allows retry', () => {
    api.list.and.returnValue(throwError(() => ({ status: 500 })));
    const fixture = TestBed.createComponent(AdminOrdersComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.error()).toContain('Não foi possível');
    expect(
      fixture.nativeElement.querySelector('app-admin-state'),
    ).not.toBeNull();
    api.list.and.returnValue(
      of({ orders: [], total: 0, approved: 0, cancelled: 0 }),
    );
    fixture.componentInstance.load();
    expect(fixture.componentInstance.error()).toBe('');
  });
});
