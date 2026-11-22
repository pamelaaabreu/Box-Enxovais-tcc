import { InlineNoticeComponent } from '../../shared/components/inline-notice/inline-notice.component';
import { MatSelectModule } from '@angular/material/select';
import { ConfirmedOrder, ShippingQuote } from '../../shared/types/checkout/checkout';
import { installmentSummary } from '../../shared/utils/installments';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { CurrencyPipe, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  EMPTY,
  Subject,
  startWith,
  catchError,
  distinctUntilChanged,
  finalize,
  map,
  switchMap,
  takeUntil,
  tap,
  timer,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CartService, QuickPurchase } from '../../core/services/cart.service';
import { AccountService, SavedAddress, contactPhonePattern, mobilePhonePattern } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';
import { CatalogLayoutComponent } from '../catalog/components/catalog-layout/catalog-layout.component';

registerLocaleData(localePt);

const postalFields = ['street', 'neighborhood', 'city', 'state'] as const;
type PostalField = (typeof postalFields)[number];

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    InlineNoticeComponent,
    CurrencyPipe,
    ReactiveFormsModule,
    MatIconModule,
    MatSelectModule,
    NgxMaskDirective,
    RouterLink,
    CatalogLayoutComponent,
  ],
  providers: [provideNgxMask({ validation: false })],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
})
export class CheckoutComponent {
  readonly cart = inject(CartService);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly account = inject(AccountService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly addressReload = new Subject<void>();
  private readonly coverageChanges = new Subject<string>();
  private readonly postalCancelled = new Subject<void>();
  private addressChosen = false;
  private coverageRequestCep = "";
  private readonly savedChoiceKey = this.addressChoiceKey();
  private readonly restoredAddressId = this.restoreAddressChoice();
  readonly addressesLoading = signal(true);
  readonly addressesError = signal('');
  readonly coverageLoading = signal(false);
  readonly coverageMessage = signal('');
  readonly coveredCep = signal('');
  readonly deliveryQuote = signal<ShippingQuote|null>(null);
  readonly checkoutTotal = computed(() => (Math.round(this.cart.total()*100)+(this.deliveryCovered()?this.deliveryQuote()?.priceCents??0:0))/100);
  readonly deliveryCovered = computed(() => !!this.coveredCep() && this.coveredCep() === this.deliveryCep());
  readonly savedAddresses = signal<SavedAddress[]>([]);
  readonly selectedAddressId = signal(0);
  readonly selectedAddress = computed(() => this.savedAddresses().find(address => address.id === this.selectedAddressId()));
  readonly saveAddress = this.fb.nonNullable.control(false);
  readonly contactPhone = this.fb.nonNullable.control('', Validators.pattern(contactPhonePattern));
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
  readonly order = signal<ConfirmedOrder | null>(
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
 readonly installments=this.fb.nonNullable.control(1,[Validators.required,Validators.pattern(/^[1-6]$/)]);
 readonly installmentOptions=[1,2,3,4,5,6];
 paymentCount():number {return this.payment.value==='card'?this.installments.value:1}
 planLabel(count:number=this.paymentCount()):string{return installmentSummary(Math.round(this.checkoutTotal()*100),count)}
  readonly paymentLabels: Record<string, string> = {
    pix: 'Pix',
    card: 'Cartão de crédito',
    boleto: 'Boleto bancário',
  };
  constructor() {
    this.cart.load();
    if (inject(ActivatedRoute, { optional: true })?.snapshot?.queryParamMap?.get('compra') === 'agora') {
      const quickPurchase = signal<QuickPurchase | null>(null);
      this.cart.consumeQuickPurchase(purchase => quickPurchase.set(purchase));
      effect(() => {
        const purchase = quickPurchase();
        if (!purchase || this.cart.loading() || !this.ready()) return;
        const hasSelectedItem = this.cart.cart().items.some(item => item.productId === purchase.productId &&
          (item.variantId ?? 0) === (purchase.variantId ?? 0) && item.available && item.quantity > 0);
        if (hasSelectedItem && this.selectedAddress() && this.deliveryCovered() && this.contactPhone.valid && this.step() === 1) {
          quickPurchase.set(null);
          this.step.set(2);
        }
      });
    }
    this.coverageChanges.pipe(
      switchMap(cep => {
        this.coverageRequestCep = cep;
        this.coveredCep.set('');
        this.deliveryQuote.set(null);
        this.coverageMessage.set('');
        this.coverageLoading.set(false);
        if (!/^\d{8}$/.test(cep)) return EMPTY;
        this.coverageLoading.set(true);
        return this.http.get<{ priceCents: number; minDays: number; maxDays: number }>('http://localhost:8080/shipping/quote', { params: { cep } }).pipe(
          tap(quote => {
            if (Number.isSafeInteger(quote.priceCents) && quote.priceCents >= 0 && Number.isSafeInteger(quote.minDays) && quote.minDays >= 0 && Number.isSafeInteger(quote.maxDays) && quote.maxDays >= quote.minDays) {
              this.deliveryQuote.set(quote);
              this.coveredCep.set(cep);
            } else this.coverageMessage.set('Não foi possível consultar a entrega. Tente novamente.');
          }),
          catchError((error: HttpErrorResponse) => {
            this.coverageMessage.set(error.status === 404 ? 'Entrega indisponível para este CEP no momento.' : error.status === 400 ? 'Informe um CEP válido.' : 'Não foi possível consultar a entrega. Tente novamente.');
            return EMPTY;
          }),
          finalize(() => this.coverageLoading.set(false)),
        );
      }),
      takeUntil(this.auth.userChanged), takeUntilDestroyed(),
    ).subscribe();
    this.addressReload.pipe(
      startWith(undefined),
      switchMap(() => {
        this.addressesLoading.set(true);
        this.addressesError.set('');
        return this.account.addresses().pipe(
          tap(addresses => {
            if (!Array.isArray(addresses)) throw new Error('Invalid addresses response');
            this.savedAddresses.set(addresses);
            this.addressesLoading.set(false);
            const current = this.addressChosen ? this.selectedAddressId() : this.restoredAddressId;
            const id = current === 0 ? 0 : addresses.find(a => a.id === current)?.id ?? addresses.find(a => a.isDefault)?.id ?? addresses[0]?.id ?? 0;
            this.selectAddress(id);
          }),
          catchError(() => {
            this.addressesError.set('Não foi possível carregar seus endereços. Tente novamente.');
            return EMPTY;
          }),
          finalize(() => this.addressesLoading.set(false)),
        );
      }),
      takeUntil(this.auth.userChanged), takeUntilDestroyed(),
    ).subscribe();
    this.account.profile().pipe(takeUntil(this.auth.userChanged), takeUntilDestroyed()).subscribe({
      next: profile => {
        if (this.contactPhone.pristine && mobilePhonePattern.test(profile.phone)) {
          this.contactPhone.setValue(profile.phone.replace(/[^0-9]/g, '').slice(-11));
        }
      },
      error: () => { /* A contact number may still be entered manually. */ },
    });
    this.auth.userChanged.pipe(takeUntilDestroyed()).subscribe(() => {
      this.clearAddressChoice();
      this.savedAddresses.set([]);
      this.selectedAddressId.set(0);
      this.coveredCep.set('');
        this.deliveryQuote.set(null);
      this.postalCancelled.next();
      void this.router.navigate(['/cart']);
    });
    for (const key of postalFields) {
      this.address.controls[key].valueChanges
        .pipe(takeUntilDestroyed())
        .subscribe(() => this.postalRevisions[key]++);
    }
    this.address.controls.zipCode.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (!this.selectedAddress()) this.checkCoverage();
    });
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
            switchMap(() => this.account.lookupZip(cep)),
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
            takeUntil(this.postalCancelled),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }
  retryAddresses(): void { this.addressReload.next(); }

  selectAddress(id: number): void {
    if (id !== 0 && !this.savedAddresses().some(a => a.id === id)) return;
    this.error.set('');
    this.addressChosen = true;
    this.postalCancelled.next();
    this.postalLoading.set(false);
    this.selectedAddressId.set(id);
    this.saveAddress.setValue(false);
    this.rememberAddressChoice(id);
    this.checkCoverage();
  }

  deliveryCep(): string {
    return (this.selectedAddress()?.zipCode ?? this.address.controls.zipCode.value).replace(/[^0-9]/g, '');
  }

  checkCoverage(): void {
    const cep = this.deliveryCep();
    if (this.step() === 1) this.error.set('');
    if (this.coverageLoading() && this.coverageRequestCep === cep) return;
    this.coverageChanges.next(cep);
  }

  private addressChoiceKey(): string | null {
    try {
      const token = this.auth.getToken?.();
      if (!token) return null;
      const id = jwtDecode<{ userId: number }>(token).userId;
      return Number.isSafeInteger(id) && id > 0 ? 'box.checkout.address.' + id : null;
    } catch { return null; }
  }

  private restoreAddressChoice(): number | null {
    try {
      const key = this.savedChoiceKey;
      const raw = key ? sessionStorage.getItem(key) : null;
      if (!raw) return null;
      const saved = JSON.parse(raw);
      return Number.isSafeInteger(saved.id) && saved.id >= 0 && saved.expires > Date.now() ? saved.id : null;
    } catch { return null; }
  }

  private rememberAddressChoice(id: number): void {
    try {
      const key = this.savedChoiceKey;
      if (key) sessionStorage.setItem(key, JSON.stringify({ id, expires: Date.now() + 1800000 }));
    } catch { return; }
  }

  private clearAddressChoice(): void {
    try {
      const key = this.savedChoiceKey;
      if (key) sessionStorage.removeItem(key);
    } catch { return; }
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
    if (this.busy() || this.addressesLoading() || this.addressesError() || ![1, 2].includes(this.step())) return;
    this.address.markAllAsTouched();
    this.contactPhone.markAsTouched();
    if ((!this.selectedAddress() && this.address.invalid) || this.contactPhone.invalid || !this.ready()) return;
    if (!this.deliveryCovered()) {
      if (!this.coverageMessage() && !this.coverageLoading()) this.checkCoverage();
      return;
    }
    if (!Object.hasOwn(this.paymentLabels, this.payment.value) || (this.payment.value==='card' && this.installments.invalid)) {this.installments.markAsTouched();return;}
    this.error.set('');
    this.step.update((value) => Math.min(value + 1, 3));
  }
  confirm(): void {
    if (
      this.busy() ||
      this.addressesLoading() || !!this.addressesError() || !this.deliveryCovered() ||
      !!this.order() ||
      !this.ready() ||
      (!this.selectedAddress() && this.address.invalid) || this.contactPhone.invalid ||
      this.step() !== 3 ||
      !Object.hasOwn(this.paymentLabels, this.payment.value) || (this.payment.value==='card' && this.installments.invalid)
    )
      return;
    this.busy.set(true);
    this.error.set('');
    this.http
      .post<{
        success?: boolean;
        data?: ConfirmedOrder;
      } | null>('http://localhost:8080/checkout', {
        requestKey: this.requestKey,
        ...(this.selectedAddress()
          ? { addressId: this.selectedAddressId() }
          : { address: this.address.getRawValue() }),
        ...(this.saveAddress.value && !this.selectedAddress() ? { saveAddress: true } : {}),
        ...(this.contactPhone.value ? { contactPhone: this.contactPhone.value } : {}),
        paymentMethod: this.payment.value,
        expectedTotalCents: Math.round(this.checkoutTotal() * 100),
        installments: this.paymentCount(),
      })
      .pipe(
        takeUntil(this.auth.userChanged),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (response) => {
          const order = response?.data;
          if (
            response?.success !== true ||
            !order ||
            !Number.isSafeInteger(order.id) ||
            order.id <= 0 ||
            !Number.isFinite(order.total) ||
            order.total < 0 ||
            order.status !== 'simulated_approved'
          ) {
            this.error.set(
              'Resposta inválida do servidor. Tente novamente para consultar ou concluir esta mesma compra.',
            );
            return;
          }
          this.clearAddressChoice();
          this.order.set(order);
          void this.openConfirmedOrder();
        },
        error: (error: HttpErrorResponse) => {
          const body = error.error;
          const message =
            body?.success === false && typeof body.message === 'string'
              ? body.message
              : null;
          this.error.set(
            error.status === 0
              ? 'Sem conexão. Tente novamente para consultar ou concluir esta mesma compra.'
              : error.status === 401
                ? 'Sua sessão expirou. Faça login novamente.'
                : (error.status >= 200 && error.status < 300) ||
                    typeof body === 'string' ||
                    body?.error instanceof SyntaxError
                  ? 'Resposta inválida do servidor. Tente novamente para consultar ou concluir esta mesma compra.'
                  : message ||
                    'Não foi possível concluir a compra. Tente novamente.',
          );
          if (error.status === 422) {
            this.coveredCep.set('');
        this.deliveryQuote.set(null);
            this.coverageMessage.set(message || 'Entrega indisponível para este CEP no momento.');
            this.step.set(1);
          }
          if (error.status === 409) {
            this.cart.load();
            this.checkCoverage();
            this.step.set(1);
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
    if (this.step() === 3 || this.busy() || this.cart.busy() || this.order())
      return;
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
