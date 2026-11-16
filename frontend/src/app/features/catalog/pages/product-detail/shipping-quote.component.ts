import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgxMaskDirective } from 'ngx-mask';
import { Subscription } from 'rxjs';

interface ShippingQuote { priceCents: number; minDays: number; maxDays: number; }

@Component({
  selector: 'app-shipping-quote',
  imports: [CurrencyPipe, FormsModule, NgxMaskDirective],
  template: `
    <section aria-label="Estimativa de entrega">
      <form (ngSubmit)="calculate()">
        <label for="quote-cep">Digite seu CEP</label>
        <div class="controls">
          <input id="quote-cep" name="cep" placeholder="00000-000" autocomplete="postal-code"
            inputmode="numeric" mask="00000-000" [ngModel]="cep()" (ngModelChange)="changeCep($event)"
            [attr.aria-invalid]="invalid()" aria-describedby="quote-note" />
          <button type="submit" [disabled]="loading()">{{ loading() ? 'Calculando…' : 'Calcular entrega' }}</button>
        </div>
      </form>
      <p id="quote-note">Estimativa simulada. O valor não é somado ao total do pedido.</p>
      <div aria-live="polite" [attr.aria-busy]="loading()">
        @if (message()) { <p>{{ message() }}</p> }
        @if (quote(); as result) {
          <div class="result">
            <strong>Entrega disponível para seu CEP</strong>
            <p>Frete estimado {{ result.priceCents / 100 | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</p>
            <p>Prazo estimado de {{ result.minDays === result.maxDays ? result.minDays : result.minDays + ' a ' + result.maxDays }} dia(s) útil(eis)</p>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    section { margin-top: 18px; font-size: 14px; color: #3d4836; }
    form { display: grid; gap: 5px; }
    .controls { display: flex; gap: 8px; flex-wrap: wrap; }
    input, button { min-height: 44px; border: 1px solid #d8dccf; border-radius: 10px; padding: 7px 12px; font: inherit; }
    #quote-cep { flex: 1 1 140px; min-width: 0; box-sizing: border-box; background: #fffdf8; color: #3d4836; border-color: #87917d; }
    #quote-cep::placeholder { color: #6b7366; opacity: 1; }
    #quote-cep:focus { border: 1px solid #526047 !important; outline: 2px solid #667255 !important; outline-offset: 2px; background: #fffdf8 !important; }
    #quote-cep:-webkit-autofill { -webkit-text-fill-color: #3d4836; box-shadow: inset 0 0 0 100px #fffdf8 !important; }
    #quote-cep[aria-invalid="true"] { border-color: #a2402f; }
    button { background: #3d4836; color: white; cursor: pointer; }
    button:disabled { opacity: .7; }
    :focus-visible { outline: 2px solid #667255; outline-offset: 2px; }
    p { margin: 6px 0 0; }
    #quote-note { font-size: 12px; }
    .result { margin-top: 10px; padding: 12px; background: #eef0e9; border-radius: 10px; }
  `,
})
export class ShippingQuoteComponent {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  readonly cep = signal('');
  readonly loading = signal(false);
  readonly invalid = signal(false);
  readonly message = signal('');
  readonly quote = signal<ShippingQuote | null>(null);

  changeCep(value: string): void {
    this.request?.unsubscribe();
    this.cep.set(value);
    this.quote.set(null);
    this.message.set('');
    this.invalid.set(false);
    this.loading.set(false);
  }

  calculate(): void {
    if (this.loading()) return;
    const cep = this.cep().replace('-', '');
    this.quote.set(null);
    if (!/^\d{8}$/.test(cep)) {
      this.invalid.set(true);
      this.message.set('Informe um CEP válido com oito dígitos.');
      return;
    }
    this.message.set('');
    this.loading.set(true);
    this.request = this.http.get<ShippingQuote>('http://localhost:8080/shipping/quote', { params: { cep } })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: result => { this.quote.set(result); this.loading.set(false); },
        error: (error: HttpErrorResponse) => {
          this.message.set(error.status === 404
            ? 'Entrega indisponível para este CEP no momento.'
            : 'Não foi possível calcular a entrega. Tente novamente.');
          this.loading.set(false);
        },
      });
  }
}

