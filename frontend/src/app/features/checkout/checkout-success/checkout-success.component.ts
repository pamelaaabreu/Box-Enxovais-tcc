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
import { CatalogLayoutComponent } from '../../catalog/components/catalog-layout/catalog-layout.component';

registerLocaleData(localePt);

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, CatalogLayoutComponent],
  styleUrl: './checkout-success.component.scss',
  templateUrl: './checkout-success.component.html',
})
export class CheckoutSuccessComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly reload = new BehaviorSubject(0);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly order = signal<{ id: number; total: number; status: string } | null>(
    null,
  );

  constructor() {
    this.auth.userChanged.pipe(takeUntilDestroyed()).subscribe(() => {
      this.order.set(null);
      void this.router.navigate(['/login']);
    });
    combineLatest([this.route.paramMap, this.reload])
      .pipe(
        switchMap(([params]) => {
          this.loading.set(true);
          this.error.set('');
          this.order.set(null);
          const id = params.get('id') || '';
          if (!/^[1-9]\d*$/.test(id)) {
            this.loading.set(false);
            this.error.set('Pedido inválido.');
            return EMPTY;
          }
          return this.http
            .get<{
              success: boolean;
              data?: { id: number; total: number; status: string };
            }>(`http://localhost:8080/checkout/success/${id}`)
            .pipe(
              takeUntil(this.auth.userChanged),
              catchError((error) => {
                this.loading.set(false);
                this.error.set(
                  error.status === 404
                    ? 'Pedido não encontrado.'
                    : 'Não foi possível consultar o pedido. Tente novamente.',
                );
                if (error.status === 401) void this.router.navigate(['/login']);
                return EMPTY;
              }),
            );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((response) => {
        this.loading.set(false);
        const order = response?.data;
        if (response?.success === true && order?.status === 'simulated_approved' &&
            String(order.id) === this.route.snapshot.paramMap.get('id') &&
            Number.isFinite(order.total) && order.total >= 0) {
          this.order.set(order);
        } else {
          this.error.set('Não foi possível confirmar os dados do pedido.');
        }
      });
  }

  retry(): void {
    this.reload.next(this.reload.value + 1);
  }
}
