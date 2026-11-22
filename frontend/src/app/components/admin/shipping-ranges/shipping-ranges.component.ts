import { AdminStateComponent } from '../../../shared/components/admin-state/admin-state.component';
import { AdminPageHeaderComponent } from '../../../shared/components/admin-page-header/admin-page-header.component';
import { CurrencyPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { filter, finalize } from 'rxjs';
import { CustomAlertService } from '../../../core/services/custom-alert.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';

interface ShippingRange {
  id: number;
  name: string;
  startCep: string;
  endCep: string;
  priceCents: number;
  minDays: number;
  maxDays: number;
  active: boolean;
}

@Component({
  providers: [provideNgxMask()],
  selector: 'app-shipping-ranges',
  imports: [
    AdminStateComponent,
    AdminPageHeaderComponent,
    CurrencyPipe,
    MatButtonModule,
    NgxMaskDirective,
    ReactiveFormsModule,
  ],
  templateUrl: './shipping-ranges.component.html',
  styleUrl: '../catalog-registration.component.scss',
})
export class ShippingRangesComponent {
  private readonly http = inject(HttpClient);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly alerts = inject(CustomAlertService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly url = 'http://localhost:8080/admin/catalog/shipping-ranges';
  private id: number | null = null;
  readonly items = signal<ShippingRange[]>([]);
  readonly query = signal('');
  readonly status = signal('all');
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly saving = signal(false);
  readonly editing = signal(false);
  readonly error = signal('');
  readonly filtered = computed(() => {
    const term = this.query().trim().toLowerCase();
    const cep = term.replace('-', '');
    return this.items().filter(
      (item) =>
        (this.status() === 'all' ||
          item.active === (this.status() === 'active')) &&
        (item.name.toLowerCase().includes(term) ||
          (/^\d+$/.test(cep) &&
            [item.startCep, item.endCep].some((value) => value.includes(cep)))),
    );
  });
  readonly form = inject(FormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    startCep: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    endCep: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    price: [
      0,
      [Validators.required, Validators.min(0), Validators.max(21474836.47)],
    ],
    minDays: [
      0,
      [Validators.required, Validators.min(0), Validators.max(2147483647)],
    ],
    maxDays: [
      0,
      [Validators.required, Validators.min(0), Validators.max(2147483647)],
    ],
    active: [true],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.http
      .get<ShippingRange[]>(this.url)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (items) => this.items.set(items),
        error: () => this.failed.set(true),
      });
  }

  start(item?: ShippingRange): void {
    this.id = item?.id ?? null;
    this.error.set('');
    this.form.reset({
      name: item?.name ?? '',
      startCep: item?.startCep ?? '',
      endCep: item?.endCep ?? '',
      price: (item?.priceCents ?? 0) / 100,
      minDays: item?.minDays ?? 0,
      maxDays: item?.maxDays ?? 0,
      active: item?.active ?? true,
    });
    this.editing.set(true);
  }

  save(): void {
    if (this.saving()) return;
    const { name, startCep, endCep, price, minDays, maxDays, active } =
      this.form.getRawValue();
    if (
      this.form.invalid ||
      !name?.trim() ||
      !startCep ||
      !endCep ||
      price === null ||
      minDays === null ||
      maxDays === null ||
      startCep > endCep ||
      minDays > maxDays ||
      !Number.isInteger(minDays) ||
      !Number.isInteger(maxDays) ||
      !/^\d+(\.\d{1,2})?$/.test(String(price))
    ) {
      this.error.set(
        'Confira os CEPs, o valor e a ordem dos limites e prazos.',
      );
      return;
    }
    const body = {
      name: name.trim(),
      startCep,
      endCep,
      priceCents: Math.round(price * 100),
      minDays,
      maxDays,
      active: !!active,
    };
    this.persist(
      this.id
        ? this.http.patch(this.url + '/' + this.id, body)
        : this.http.post(this.url, body),
      'Faixa salva.',
      true,
    );
  }

  toggle(item: ShippingRange): void {
    const { id, ...body } = item;
    this.persist(
      this.http.patch(this.url + '/' + id, { ...body, active: !item.active }),
      item.active ? 'Faixa desativada.' : 'Faixa ativada.',
    );
  }

  remove(item: ShippingRange): void {
    this.confirm
      .open({
        title: 'Excluir faixa de CEP?',
        message: item.name,
        variant: 'danger',
        primary: 'Excluir',
        secondary: 'Cancelar',
        execute: () => this.http.delete(this.url + '/' + item.id),
        errorMessage: (error) => this.message(error),
      })
      .afterClosed()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter((result) => result === true),
      )
      .subscribe(() => {
        this.alerts.success('Faixa excluída.');
        this.load();
      });
  }

  formatCep(value: string): string {
    return value.slice(0, 5) + '-' + value.slice(5);
  }

  private persist(
    request: ReturnType<HttpClient['post']>,
    success: string,
    closeEditor = false,
  ): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          if (closeEditor) this.editing.set(false);
          this.alerts.success(success);
          this.load();
        },
        error: (error) => this.error.set(this.message(error)),
      });
  }

  private message(error: unknown): string {
    return error instanceof HttpErrorResponse &&
      typeof error.error?.message === 'string'
      ? error.error.message
      : 'Não foi possível concluir a operação.';
  }
}
