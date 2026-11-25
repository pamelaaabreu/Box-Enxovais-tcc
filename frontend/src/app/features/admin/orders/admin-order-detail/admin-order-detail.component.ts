import { installmentSummary } from '../../../../shared/utils/installments';
import {
  Component,
  LOCALE_ID,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { AdminPageHeaderComponent } from '../../../../shared/components/admin-page-header/admin-page-header.component';
import { AdminStateComponent } from '../../../../shared/components/admin-state/admin-state.component';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { CustomAlertService } from '../../../../core/services/custom-alert.service';
import {
  AdminOrdersService,
  orderStatus,
  orderPayment,
} from '../services/admin-orders.service';
import type { AdminOrderDetails } from '../../../../shared/types/orders/admin-order';
@Component({
  selector: 'app-admin-order-detail',
  standalone: true,
  providers: [{ provide: LOCALE_ID, useValue: 'pt-BR' }],
  imports: [
    CurrencyPipe,
    DatePipe,
    AdminPageHeaderComponent,
    AdminStateComponent,
  ],
  templateUrl: './admin-order-detail.component.html',
  styleUrls: [
    '../styles/order-layout.scss',
    './admin-order-detail.component.scss',
  ],
})
export class AdminOrderDetailComponent {
  readonly planLabel = installmentSummary;
  readonly mathRound = Math.round;
  readonly api = inject(AdminOrdersService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly alerts = inject(CustomAlertService);
  private request?: Subscription;
  readonly order = signal<AdminOrderDetails | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly missing = signal(false);
  readonly statusLabel = orderStatus;
  readonly paymentLabel = orderPayment;
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(() => this.load());
  }
  load() {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.missing.set(false);
    this.request = this.api
      .detail(this.route.snapshot.paramMap.get('id') ?? '')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (o) => {
          this.order.set(o);
          this.loading.set(false);
        },
        error: (err) => {
          this.order.set(null);
          this.loading.set(false);
          this.missing.set(err.status === 404);
          this.error.set(
            'Não foi possível consultar o pedido. Tente novamente.',
          );
        },
      });
  }
  cancel() {
    const order = this.order();
    if (!order?.canCancel) return;
    this.confirm
      .open({
        title: `Cancelar pedido #${order.id}?`,
        message:
          'O pedido será cancelado e as unidades serão devolvidas ao estoque. Esta ação não pode ser desfeita.',
        variant: 'danger',
        disableClose: true,
        icon: 'cancel',
        primary: 'Cancelar pedido',
        secondary: 'Manter pedido',
        execute: () => this.api.cancel(order.id),
        errorMessage: (err) =>
          (err as { error?: { message?: string } }).error?.message ??
          'Não foi possível cancelar o pedido. Tente novamente.',
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((ok) => {
        if (ok) {
          this.alerts.success('Pedido cancelado com sucesso');
          this.load();
        }
      });
  }
  reason(value: string) {
    const [code, ...details] = value.split(': ');
    return (
      ({
        changed_mind: 'Desistência da compra',
        wrong_product: 'Produto incorreto',
        wrong_address: 'Endereço incorreto',
        duplicate_order: 'Pedido duplicado',
        other: 'Outro motivo',
      }[code] ?? code) + (details.length ? ': ' + details.join(': ') : '')
    );
  }
}
