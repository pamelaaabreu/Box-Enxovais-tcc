import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  provideRouter,
  convertToParamMap,
} from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminCustomerDetailComponent } from './admin-customer-detail.component';
import { AdminCustomersService } from '../services/admin-customers.service';
import type { CustomerDetails } from '../../../../shared/types/customers/customer';
describe('AdminCustomerDetailComponent', () => {
  let api: jasmine.SpyObj<AdminCustomersService>;
  const customer: CustomerDetails = {
    id: 12,
    name: 'Ana',
    email: 'ana@example.test',
    phone: '',
    createdAt: null,
    orders: 2,
    validOrders: 1,
    cancelledOrders: 1,
    totalSpent: 25,
    lastPurchase: null,
    addresses: [],
  };
  beforeEach(() => {
    api = jasmine.createSpyObj('customers', ['detail', 'orders']);
    api.detail.and.returnValue(of(customer));
    api.orders.and.returnValue(
      of({
        orders: [
          {
            id: 8,
            customerId: 12,
            customer: 'Ana',
            createdAt: '2026-01-01',
            total: 25,
            status: 'simulated_approved',
            paymentMethod: 'pix',
          },
        ],
        total: 1,
        approved: 1,
        cancelled: 0,
      }),
    );
    TestBed.configureTestingModule({
      imports: [AdminCustomerDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '12' })),
            queryParamMap: of(convertToParamMap({})),
          },
        },
        { provide: AdminCustomersService, useValue: api },
      ],
    });
  });
  it('shows persisted summary, optional fields and no write actions', () => {
    const f = TestBed.createComponent(AdminCustomerDetailComponent);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('R$');
    expect(f.nativeElement.textContent).toContain('25,00');
    expect(f.nativeElement.textContent).toContain('Não registrada');
    expect(f.nativeElement.textContent).not.toContain('Excluir');
    expect(f.nativeElement.textContent).not.toContain('Redefinir senha');
  });
  it('links orders to the existing admin detail', () => {
    const f = TestBed.createComponent(AdminCustomerDetailComponent);
    f.detectChanges();
    expect(
      f.nativeElement.querySelector('a[href="/admin/pedidos/8"]'),
    ).not.toBeNull();
    expect(api.orders).toHaveBeenCalledWith('12', 1);
  });
  it('paginates history in the URL', () => {
    const c = TestBed.createComponent(
      AdminCustomerDetailComponent,
    ).componentInstance;
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(
      true,
    );
    c.changePage(2);
    expect(navigate.calls.mostRecent().args[1]?.queryParams?.['page']).toBe(2);
  });
  it('uses the not found state and does not fetch history for missing customers', () => {
    api.detail.and.returnValue(throwError(() => ({ status: 404 })));
    const f = TestBed.createComponent(AdminCustomerDetailComponent);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Cliente não encontrado');
    expect(api.orders).not.toHaveBeenCalled();
  });
  it('retains customer detail when order history fails and allows retry', () => {
    api.orders.and.returnValue(throwError(() => ({ status: 500 })));
    const f = TestBed.createComponent(AdminCustomerDetailComponent);
    f.detectChanges();
    expect(f.componentInstance.customer()?.name).toBe('Ana');
    expect(f.nativeElement.textContent).toContain(
      'Falha ao carregar histórico',
    );
    api.orders.and.returnValue(
      of({ orders: [], total: 0, approved: 0, cancelled: 0 }),
    );
    f.componentInstance.loadOrders();
    expect(f.componentInstance.ordersError()).toBe('');
  });
});
