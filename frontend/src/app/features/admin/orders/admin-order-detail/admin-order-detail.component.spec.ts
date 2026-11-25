import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminOrderDetailComponent } from './admin-order-detail.component';
import { AdminOrdersService } from '../services/admin-orders.service';
import type { AdminOrderDetails } from '../../../../shared/types/orders/admin-order';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { CustomAlertService } from '../../../../core/services/custom-alert.service';
describe('AdminOrderDetailComponent', () => {
  let api: jasmine.SpyObj<AdminOrdersService>;
  let confirm: jasmine.SpyObj<ConfirmDialogService>;
  const order: AdminOrderDetails = {
    id: 12,
    customerId: 1,
    customer: 'Ana',
    createdAt: '2026-01-01T12:00:00Z',
    status: 'simulated_approved',
    total: 25,
    subtotal: 25,
    discount: null,
    shipping: null,
    items: [],
    events: [],
    address: {
      recipient: '',
      zipCode: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
    },
    canCancel: true,
    paymentMethod: 'pix',
  };
  beforeEach(() => {
    api = jasmine.createSpyObj('orders', ['detail', 'cancel', 'image']);
    api.detail.and.returnValue(of(order));
    api.cancel.and.returnValue(of({ success: true }));
    confirm = jasmine.createSpyObj('confirm', ['open']);
    confirm.open.and.returnValue({
      afterClosed: () => of(false),
    } as unknown as ReturnType<ConfirmDialogService['open']>);
    TestBed.configureTestingModule({
      imports: [AdminOrderDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '12' })),
            snapshot: { paramMap: convertToParamMap({ id: '12' }) },
          },
        },
        { provide: AdminOrdersService, useValue: api },
        { provide: ConfirmDialogService, useValue: confirm },
        {
          provide: CustomAlertService,
          useValue: { success: jasmine.createSpy() },
        },
      ],
    });
  });
  it('renders actual values and explicitly marks unrecorded financial information', () => {
    const fixture = TestBed.createComponent(AdminOrderDetailComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Não registrados');
    expect(fixture.componentInstance.order()?.customer).toBe('Ana');
    expect(
      fixture.nativeElement.querySelectorAll('.order-details .panel').length,
    ).toBe(3);
    expect(fixture.nativeElement.querySelector('.order-history')).toBeNull();
    expect(fixture.nativeElement.querySelector('.order-customer')).toBeNull();
    expect(fixture.componentInstance.order()?.total).toBe(25);
  });
  it('requires the shared confirmation and does not cancel when dismissed', () => {
    const c = TestBed.createComponent(
      AdminOrderDetailComponent,
    ).componentInstance;
    c.cancel();
    expect(confirm.open.calls.mostRecent().args[0].variant).toBe('danger');
    expect(api.cancel).not.toHaveBeenCalled();
  });
  it('executes cancellation only through the modal observable and reloads on success', () => {
    confirm.open.and.returnValue({
      afterClosed: () => of(true),
    } as unknown as ReturnType<ConfirmDialogService['open']>);
    const c = TestBed.createComponent(
      AdminOrderDetailComponent,
    ).componentInstance;
    c.cancel();
    confirm.open.calls.mostRecent().args[0].execute!().subscribe();
    expect(api.cancel).toHaveBeenCalledWith(12);
    expect(api.detail).toHaveBeenCalledTimes(2);
  });
  it('does not offer unsupported cancellation transitions', () => {
    api.detail.and.returnValue(
      of({ ...order, canCancel: false, status: 'cancelled' }),
    );
    const fixture = TestBed.createComponent(AdminOrderDetailComponent);
    fixture.detectChanges();
    fixture.componentInstance.cancel();
    expect(confirm.open).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.danger')).toBeNull();
  });
  it('uses the shared not-found state', () => {
    api.detail.and.returnValue(throwError(() => ({ status: 404 })));
    const fixture = TestBed.createComponent(AdminOrderDetailComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Pedido não encontrado',
    );
  });
});
