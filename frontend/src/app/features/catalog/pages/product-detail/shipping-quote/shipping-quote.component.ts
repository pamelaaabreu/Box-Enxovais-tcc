import { ShippingService } from '../../../../../core/services/shipping.service';
import { HttpErrorResponse } from '@angular/common/http';
import { CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Subscription, catchError, map, of } from 'rxjs';
import { AccountService } from '../../../../../core/services/account.service';

import type { ShippingQuote } from '../../../../../shared/types/checkout/checkout';

@Component({
  providers: [provideNgxMask()],
  selector: 'app-shipping-quote',
  imports: [CurrencyPipe, FormsModule, NgxMaskDirective],
  templateUrl: './shipping-quote.component.html',
  styleUrl: './shipping-quote.component.scss',
})
export class ShippingQuoteComponent {
  private readonly shippingApi = inject(ShippingService);
  private readonly account = inject(AccountService);
  private readonly destroyRef = inject(DestroyRef);

  private request?: Subscription;

  readonly cep = signal('');
  readonly loading = signal(false);
  readonly touched = signal(false);

  // Indica se o CEP foi tocado e está inválido.
  readonly invalid = computed(() => this.touched() && !this.isValidCep());

  touchCep(): void {
    this.touched.set(true);
  }

  private isValidCep(): boolean {
    return /^\d{8}$/.test(this.cep().replace('-', ''));
  }

  readonly message = signal('');
  readonly quote = signal<ShippingQuote | null>(null);

  // Cancela a consulta anterior quando o CEP muda.
  changeCep(value: string): void {
    this.request?.unsubscribe();

    this.cep.set(value);
    this.quote.set(null);
    this.message.set('');
    this.loading.set(false);
  }

  calculate(): void {
    if (this.loading()) return;

    const cep = this.cep().replace('-', '');

    this.quote.set(null);
    this.touchCep();
    this.message.set('');

    if (this.invalid()) return;

    this.loading.set(true);

    // Consulta o valor e prazo da entrega.
    this.request = this.shippingApi
      .quote(cep)
      .pipe(
        map((result) => ({
          result,
          message: '',
        })),

        catchError((error: HttpErrorResponse) => {
          const failed = {
            result: null,
            message: 'Não foi possível calcular a entrega. Tente novamente.',
          };

          if (error.status !== 404) return of(failed);

          // Verifica se o CEP existe quando não há cobertura.
          return this.account.lookupZip(cep).pipe(
            map((address) => ({
              result: null,
              message: address.erro
                ? 'CEP não encontrado.'
                : 'Entrega indisponível para este CEP no momento.',
            })),
            catchError(() => of(failed)),
          );
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ result, message }) => {
        this.quote.set(result);
        this.message.set(message);
        this.loading.set(false);
      });
  }
}
