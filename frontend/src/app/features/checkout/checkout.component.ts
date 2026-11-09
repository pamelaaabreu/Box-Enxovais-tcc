import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpBackend, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import {
  EMPTY,
  catchError,
  distinctUntilChanged,
  finalize,
  map,
  switchMap,
  takeUntil,
  tap,
  timeout,
  timer,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { CatalogLayoutComponent } from '../catalog/components/catalog-layout/catalog-layout.component';

registerLocaleData(localePt);

const postalFields = ['street', 'neighborhood', 'city', 'state'] as const;
type PostalField = (typeof postalFields)[number];

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    MatIconModule,
    RouterLink,
    CatalogLayoutComponent,
  ],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
})
export class CheckoutComponent {
  readonly cart = inject(CartService);
  private readonly http = inject(HttpClient);
  // Public lookup must never carry the API's authentication headers.
  private readonly postalHttp = new HttpClient(inject(HttpBackend));
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly step = signal(1);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly openingOrder = signal(false);
  readonly postalLoading = signal(false);
  readonly postalMessage = signal('');
  readonly postalFilled = signal<readonly string[]>([]);
  readonly editingPostalAddress = signal(false);
  private appliedPostalFields: readonly PostalField[] = [];
  private postalAddress: Partial<Record<PostalField, string>> = {};
  private readonly postalRevisions: Record<PostalField, number> = {
    street: 0,
    neighborhood: 0,
    city: 0,
    state: 0,
  };
  readonly order = signal<{ id: number; total: number; status: string } | null>(
    null,
  );
  private readonly requestKey = crypto.randomUUID();
  readonly ready = computed(
    () =>
      !this.cart.busy() &&
      !this.cart.error() &&
      this.cart.cart().items.length > 0 &&
      this.cart.cart().items.every((item) => item.available),
  );
  readonly states = [
    'AC',
    'AL',
    'AP',
    'AM',
    'BA',
    'CE',
    'DF',
    'ES',
    'GO',
    'MA',
    'MT',
    'MS',
    'MG',
    'PA',
    'PB',
    'PR',
    'PE',
    'PI',
    'RJ',
    'RN',
    'RS',
    'RO',
    'RR',
    'SC',
    'SP',
    'SE',
    'TO',
  ];
  readonly fields = [
    { key: 'recipient', label: 'Destinatário', autocomplete: 'name' },
    { key: 'zipCode', label: 'CEP', autocomplete: 'postal-code' },
    { key: 'street', label: 'Logradouro', autocomplete: 'address-line1' },
    { key: 'number', label: 'Número', autocomplete: 'off' },
    {
      key: 'complement',
      label: 'Complemento (opcional)',
      autocomplete: 'address-line2',
    },
    { key: 'neighborhood', label: 'Bairro', autocomplete: 'off' },
    { key: 'city', label: 'Cidade', autocomplete: 'address-level2' },
  ];
  readonly address = this.fb.nonNullable.group({
    recipient: [
      '',
      [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(200),
      ],
    ],
    zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}-?\d{3}$/)]],
    street: [
      '',
      [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(200),
      ],
    ],
    number: [
      '',
      [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(200),
      ],
    ],
    complement: ['', Validators.maxLength(200)],
    neighborhood: [
      '',
      [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(200),
      ],
    ],
    city: [
      '',
      [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(200),
      ],
    ],
    state: ['', Validators.required],
  });
  readonly payment = this.fb.nonNullable.control('pix', Validators.required);
  readonly paymentLabels: Record<string, string> = {
    pix: 'Pix',
    card: 'Cartão de crédito',
    boleto: 'Boleto bancário',
  };
  constructor() {
    this.cart.load();
    this.auth.userChanged.pipe(takeUntilDestroyed()).subscribe(() => {
      void this.router.navigate(['/cart']);
    });
    for (const key of postalFields) {
      this.address.controls[key].valueChanges
        .pipe(takeUntilDestroyed())
        .subscribe(() => this.postalRevisions[key]++);
    }
    this.address.controls.zipCode.valueChanges
      .pipe(
        map((value) =>
          /^\d{5}-?\d{3}$/.test(value) ? value.replace('-', '') : '',
        ),
        distinctUntilChanged(),
        switchMap((cep) => {
          this.postalLoading.set(false);
          this.postalMessage.set('');
          for (const key of this.appliedPostalFields) {
            const control = this.address.controls[key];
            if (control.value === this.postalAddress[key]) control.reset();
          }
          this.appliedPostalFields = [];
          this.postalAddress = {};
          this.editingPostalAddress.set(false);
          this.postalFilled.set([]);
          if (!cep) return EMPTY;
          const revisions = { ...this.postalRevisions };
          return timer(300).pipe(
            tap(() => this.postalLoading.set(true)),
            switchMap(() =>
              this.postalHttp
                .get<{
                  erro?: boolean | string;
                  logradouro?: string;
                  bairro?: string;
                  localidade?: string;
                  uf?: string;
                }>(`https://viacep.com.br/ws/${cep}/json/`)
                .pipe(timeout(8000)),
            ),
            tap((result) => {
              if (result.erro) {
                this.postalMessage.set(
                  'CEP não encontrado. Confira o CEP ou preencha o endereço manualmente.',
                );
                return;
              }
              const values = {
                street: result.logradouro,
                neighborhood: result.bairro,
                city: result.localidade,
                state: result.uf,
              };
              const filled: PostalField[] = [];
              for (const key of postalFields) {
                const raw = values[key];
                if (typeof raw !== 'string') continue;

                const value = raw.trim();
                if (
                  !value ||
                  value.length > 200 ||
                  (key === 'state' && !this.states.includes(value))
                )
                  continue;

                this.postalAddress[key] = value;
                if (this.postalRevisions[key] !== revisions[key]) continue;
                this.address.controls[key].setValue(value);
                filled.push(key);
              }
              this.appliedPostalFields = filled;
              this.postalFilled.set(filled);
            }),
            catchError(() => {
              this.postalMessage.set(
                'Não foi possível consultar o CEP. Preencha o endereço manualmente.',
              );
              return EMPTY;
            }),
            finalize(() => this.postalLoading.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }
  togglePostalAddressEditing(): void {
    if (this.editingPostalAddress()) {
      const filled: PostalField[] = [];
      for (const key of postalFields) {
        const value = this.postalAddress[key];
        if (value === undefined) continue;
        this.address.controls[key].setValue(value);
        filled.push(key);
      }
      this.appliedPostalFields = filled;
      this.postalFilled.set(filled);
      this.editingPostalAddress.set(false);
    } else if (this.postalFilled().length) {
      this.postalFilled.set([]);
      this.editingPostalAddress.set(true);
    }
  }

  next(): void {
    if (this.busy() || ![1, 2].includes(this.step())) return;
    this.address.markAllAsTouched();
    if (this.address.invalid || !this.ready()) return;
    if (!Object.hasOwn(this.paymentLabels, this.payment.value)) return;
    this.error.set('');
    this.step.update((value) => Math.min(value + 1, 3));
  }
  confirm(): void {
    if (
      this.busy() ||
      !!this.order() ||
      !this.ready() ||
      this.address.invalid ||
      this.step() !== 3 ||
      !Object.hasOwn(this.paymentLabels, this.payment.value)
    )
      return;
    this.busy.set(true);
    this.error.set('');
    this.http
      .post<{ success?: boolean; data?: { id: number; total: number; status: string } } | null>(
        'http://localhost:8080/checkout',
        {
          requestKey: this.requestKey,
          address: this.address.getRawValue(),
          paymentMethod: this.payment.value,
          expectedTotalCents: Math.round(this.cart.total() * 100),
        },
      )
      .pipe(
        takeUntil(this.auth.userChanged),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (response) => {
          const order = response?.data;
          if (response?.success !== true || !order ||
              !Number.isSafeInteger(order.id) || order.id <= 0 ||
              !Number.isFinite(order.total) || order.total < 0 ||
              order.status !== 'simulated_approved') {
            this.error.set('Resposta inválida do servidor. Tente novamente para consultar ou concluir esta mesma compra.');
            return;
          }
          this.order.set(order);
          void this.openConfirmedOrder();
        },
        error: (error: HttpErrorResponse) => {
          const body = error.error;
          const message = body?.success === false && typeof body.message === 'string'
            ? body.message
            : null;
          this.error.set(
            error.status === 0
              ? 'Sem conexão. Tente novamente para consultar ou concluir esta mesma compra.'
              : error.status === 401
                ? 'Sua sessão expirou. Faça login novamente.'
                : (error.status >= 200 && error.status < 300) ||
                    typeof body === 'string' || body?.error instanceof SyntaxError
                  ? 'Resposta inválida do servidor. Tente novamente para consultar ou concluir esta mesma compra.'
                  : message || 'Não foi possível concluir a compra. Tente novamente.',
          );
          if (error.status === 409) {
            this.cart.load();
            this.step.set(2);
          }
          if (error.status === 401) void this.router.navigate(['/login']);
        },
      });
  }
  async openConfirmedOrder(): Promise<void> {
    const order = this.order();
    if (!order || this.openingOrder()) return;
    this.openingOrder.set(true);
    this.error.set('');
    try {
      if (await this.router.navigate(['/checkout/success', order.id])) {
        this.cart.load();
        return;
      }
    } catch {
      // The order is already persisted; retry only the navigation.
    } finally {
      this.openingOrder.set(false);
    }
    this.error.set('Pedido registrado. Não foi possível abrir a confirmação.');
  }

  updateQuantity(id: number, change: number): void {
    if (this.step() === 3 || this.busy() || this.cart.busy() || this.order()) return;
    const item = this.cart.cart().items.find((item) => item.id === id);
    if (!item || ![-1, 1].includes(change)) return;
    const quantity = item.quantity + change;
    if (
      quantity < 1 ||
      (change > 0 && (!item.available || quantity > item.stock))
    )
      return;
    this.cart.update(id, quantity);
  }
  imageUrl(path: string): string {
    return /^https?:\/\//.test(path)
      ? path
      : `http://localhost:8080/${path.replace(/^\//, '')}`;
  }
  hideBrokenImage(event: Event): void {
    (event.target as HTMLImageElement).hidden = true;
  }
}
