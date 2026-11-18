import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgxMaskDirective } from 'ngx-mask';
import { Subscription, catchError, map, of } from 'rxjs';
import { AccountService } from '../../../../core/services/account.service';

interface ShippingQuote {
  priceCents: number;
  minDays: number;
  maxDays: number;
}

@Component({
  selector: 'app-shipping-quote',
  imports: [CurrencyPipe, FormsModule, NgxMaskDirective],
  template: `
    <section aria-label="Estimativa de entrega">
      <form (ngSubmit)="calculate()">
        <label for="quote-cep">Digite seu CEP</label>
        <div class="controls">
          <div class="quote-field">
            <input
              id="quote-cep"
              name="cep"
              placeholder="00000-000"
              autocomplete="postal-code"
              inputmode="numeric"
              mask="00000-000"
              [ngModel]="cep()"
              (ngModelChange)="changeCep($event)"
              [attr.aria-invalid]="invalid()"
              [attr.aria-describedby]="invalid() ? 'quote-cep-error' : null"
              (blur)="touchCep()"
            />
            @if (invalid()) {
              <p class="field-error" id="quote-cep-error" role="alert">
                Informe um CEP válido com oito dígitos.
              </p>
            }
          </div>
          <button type="submit" [disabled]="loading()">
            {{ loading() ? 'Calculando…' : 'Calcular entrega' }}
          </button>
        </div>
      </form>
      <div aria-live="polite" [attr.aria-busy]="loading()">
        @if (message()) {
          <p>{{ message() }}</p>
        }
        @if (quote(); as result) {
          <div class="result">
            <strong>Entrega disponível para seu CEP</strong>
            <p>
              Frete estimado
              {{
                result.priceCents / 100
                  | currency: 'BRL' : 'symbol' : '1.2-2' : 'pt-BR'
              }}
            </p>
            <p>
              Prazo estimado de
              {{
                result.minDays === result.maxDays
                  ? result.minDays
                  : result.minDays + ' a ' + result.maxDays
              }}
              dia(s) útil(eis)
            </p>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    section {
      margin-top: 18px;
      font-size: 14px;
      color: #3d4836;
    }
    form {
      display: grid;
      gap: 5px;
    }
    .controls {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      flex-wrap: wrap;
    }
    .quote-field {
      flex: 1 1 140px;
      min-width: 0;
    }
    .field-error {
      margin: 4px 0 0;
      color: #a2402f;
      font-size: 12px;
      font-weight: 500;
    }
    label {
      font-weight: 500;
    }
    input,
    button {
      min-height: 44px;
      border: 1px solid #d8dccf;
      border-radius: 10px;
      padding: 7px 12px;
      font: inherit;
    }
    #quote-cep {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      background: #fffdf8;
      color: #3d4836;
      border-color: #87917d;
    }
    #quote-cep::placeholder {
      color: #6b7366;
      opacity: 1;
    }
    #quote-cep:focus {
      border-color: #526047;
      outline: 2px solid #667255;
      outline-offset: 1px;
    }
    #quote-cep:-webkit-autofill {
      -webkit-text-fill-color: #3d4836;
      box-shadow: inset 0 0 0 100px #fffdf8 !important;
    }
    #quote-cep[aria-invalid='true'] {
      border-color: #a2402f;
    }
    #quote-cep[aria-invalid='true']:focus-visible {
      outline-color: #a2402f;
    }
    button {
      background: #3d4836;
      color: white;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.7;
    }
    :focus-visible {
      outline: 2px solid #667255;
      outline-offset: 2px;
    }
    p {
      margin: 6px 0 0;
    }
    .result {
      margin-top: 10px;
      padding: 12px;
      background: #eef0e9;
      border-radius: 10px;
    }
  `,
})
export class ShippingQuoteComponent {
  private readonly http = inject(HttpClient);
  private readonly account = inject(AccountService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  readonly cep = signal('');
  readonly loading = signal(false);
  readonly touched = signal(false);
  readonly invalid = computed(() => this.touched() && !this.isValidCep());

  touchCep(): void {
    this.touched.set(true);
  }

  private isValidCep(): boolean {
    return /^\d{8}$/.test(this.cep().replace('-', ''));
  }
  readonly message = signal('');
  readonly quote = signal<ShippingQuote | null>(null);

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
    this.request = this.http
      .get<ShippingQuote>('http://localhost:8080/shipping/quote', {
        params: { cep },
      })
      .pipe(
        map((result) => ({ result, message: '' })),
        catchError((error: HttpErrorResponse) => {
          const failed = {
            result: null,
            message: 'Não foi possível calcular a entrega. Tente novamente.',
          };
          if (error.status !== 404) return of(failed);
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
