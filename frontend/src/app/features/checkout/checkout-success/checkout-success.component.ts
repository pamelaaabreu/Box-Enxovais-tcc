import { ConfirmedOrder } from '../../../shared/types/checkout/checkout';
import { installmentSummary } from '../../../shared/utils/installments';
import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  BehaviorSubject,
  EMPTY,
  catchError,
  combineLatest,
  switchMap,
  takeUntil,
} from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { PurchaseReviewComponent } from '../../purchase-review/purchase-review.component';
import { CatalogLayoutComponent } from '../../catalog/components/catalog-layout/catalog-layout.component';

registerLocaleData(localePt);

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [
    CurrencyPipe,
    RouterLink,
    CatalogLayoutComponent,
    PurchaseReviewComponent,
  ],
  styleUrl: './checkout-success.component.scss',
  templateUrl: './checkout-success.component.html',
})
export class CheckoutSuccessComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  // Controla novas consultas do pedido.
  private readonly reload = new BehaviorSubject(0);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly notFound = signal(false);
  readonly canRetry = signal(false);

  readonly order = signal<ConfirmedOrder | null>(null);

  constructor() {
    // Limpa os dados quando a sessão muda.
    this.auth.userChanged.pipe(takeUntilDestroyed()).subscribe(() => {
      this.order.set(null);
      void this.router.navigate(['/login']);
    });

    // Observa os parâmetros da rota e as solicitações de recarregamento.
    combineLatest([this.route.paramMap, this.reload])
      .pipe(
        switchMap(([params]) => {
          // Reinicia o estado da interface.
          this.loading.set(true);
          this.error.set('');
          this.notFound.set(false);
          this.canRetry.set(false);
          this.order.set(null);

          const id = params.get('id') || '';

          // Aceita apenas IDs inteiros positivos.
          if (!/^[1-9]\d*$/.test(id)) {
            this.loading.set(false);
            this.notFound.set(true);

            return EMPTY;
          }

          return this.http
            .get<{
              success: boolean;
              data?: ConfirmedOrder;
            }>(`http://localhost:8080/checkout/success/${id}`)
            .pipe(
              // Cancela a consulta quando a sessão muda.
              takeUntil(this.auth.userChanged),

              catchError((error) => {
                this.loading.set(false);

                if (error.status === 404 || error.status === 400) {
                  this.notFound.set(true);
                } else if (error.status === 401) {
                  this.error.set('Sua sessão expirou. Faça login novamente.');

                  void this.router.navigate(['/login']);
                } else {
                  // Permite retry para falhas potencialmente temporárias.
                  this.canRetry.set(
                    error.status === 0 ||
                      error.status === 429 ||
                      error.status >= 500,
                  );

                  this.error.set('Não foi possível consultar o pedido agora.');
                }

                return EMPTY;
              }),
            );
        }),

        takeUntilDestroyed(),
      )
      .subscribe((response) => {
        this.loading.set(false);

        const order = response?.data;

        // Confere se a resposta representa o pedido esperado.
        if (
          response?.success === true &&
          order?.status === 'simulated_approved' &&
          String(order.id) === this.route.snapshot.paramMap.get('id') &&
          Number.isFinite(order.total) &&
          order.total >= 0
        ) {
          this.order.set(order);
        } else {
          this.error.set('Não foi possível confirmar os dados do pedido.');
        }
      });
  }

  // Formata o parcelamento para exibição.
  planLabel(order: ConfirmedOrder): string {
    return installmentSummary(
      Math.round(order.total * 100),
      order.installments,
    );
  }

  // Dispara uma nova consulta.
  retry(): void {
    if (!this.canRetry() || this.loading()) return;

    this.reload.next(this.reload.value + 1);
  }
}
