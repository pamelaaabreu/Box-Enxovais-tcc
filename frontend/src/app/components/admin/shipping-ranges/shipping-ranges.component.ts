import { AdminDataTableComponent } from '../../../shared/components/admin-data-table/admin-data-table.component';
import { MatSelectModule } from '@angular/material/select';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { AdminStateComponent } from '../../../shared/components/admin-state/admin-state.component';
import { AdminPageHeaderComponent } from '../../../shared/components/admin-page-header/admin-page-header.component';
import { CurrencyPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, TemplateRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { maskPriceInput, money } from '../../../shared/forms/price-input';
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
  imports: [AdminDataTableComponent,
    MatDialogModule, MatIconModule, MatMenuModule,
    PaginationComponent,
    MatSelectModule,
    AdminStateComponent,
    AdminPageHeaderComponent,
    CurrencyPipe,
    MatButtonModule,
    NgxMaskDirective,
    ReactiveFormsModule,
  ],
  templateUrl: './shipping-ranges.component.html',
  styleUrl: './shipping-ranges.component.scss',
})
export class ShippingRangesComponent {
  private readonly http = inject(HttpClient);
  private readonly dialog = inject(MatDialog);
  @ViewChild('editor') private editor!: TemplateRef<unknown>;
  private editorRef?: MatDialogRef<unknown>;
  private confirmingClose = false;
  readonly submitted = signal(false);
  readonly coverageError = signal('');
  readonly priceText = new FormControl('', { nonNullable: true });
  get editorTitle(): string { return this.id ? 'Editar faixa de CEP' : 'Nova faixa de CEP'; }

  private readonly confirm = inject(ConfirmDialogService);
  private readonly alerts = inject(CustomAlertService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly url = 'http://localhost:8080/admin/catalog/shipping-ranges';
  private id: number | null = null;
  readonly items = signal<ShippingRange[]>([]);
  readonly page = signal(1);
  readonly pageSize = 10;
  readonly currentPage = computed(() => Math.min(this.page(), Math.max(1, Math.ceil(this.filtered().length / this.pageSize))));
  readonly paged = computed(() => this.filtered().slice((this.currentPage() - 1) * this.pageSize, this.currentPage() * this.pageSize));
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
    this.destroyRef.onDestroy(() => this.editorRef?.close());
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
    if (this.saving() || this.editing()) return;
    this.id = item?.id ?? null;
    this.submitted.set(false);
    this.coverageError.set('');
    this.priceText.setValue(money.format((item?.priceCents ?? 0) / 100));
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
    this.editorRef = this.dialog.open(this.editor, {
      width: '540px', maxWidth: '100vw', height: '100dvh', maxHeight: '100dvh',
      position: { right: '0', top: '0' }, panelClass: 'box-shipping-drawer',
      ariaLabelledBy: 'shipping-drawer-title', autoFocus: '#shipping-name',
      restoreFocus: true, disableClose: true,
    });
    this.editorRef.backdropClick().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.requestClose());
    this.editorRef.keydownEvents().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      if (event.key === 'Escape') { event.preventDefault(); this.requestClose(); }
    });
    this.editorRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.editing.set(false); this.error.set(''); this.coverageError.set(''); this.editorRef = undefined;
    });
  }

  requestClose(): void {
    if (this.saving() || this.confirmingClose) return;
    if (!this.form.dirty) { this.editorRef?.close(); return; }
    this.confirmingClose = true;
    this.confirm.open({
      title: 'Descartar alterações?', message: 'Os dados ainda não foram salvos.',
      variant: 'warning', primary: 'Continuar editando', secondary: 'Descartar',
      confirmAction: 'secondary',
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(result => {
      this.confirmingClose = false;
      if (result === true) this.editorRef?.close();
    });
  }

  maskFreight(event: Event): void {
    maskPriceInput(event, this.priceText);
    const value = this.priceText.value.replace(/\./g, '').replace(',', '.');
    this.form.controls.price.setValue(value ? Number(value) : null);
    this.form.controls.price.markAsDirty();
  }

  fieldError(name: keyof typeof this.form.controls): string {
    const control = this.form.controls[name];
    if (!control.touched && !this.submitted()) return '';
    if (control.hasError('required')) return 'Preencha este campo.';
    if (control.hasError('pattern')) return 'Informe um CEP com 8 dígitos.';
    if (control.hasError('maxlength')) return 'Use até 100 caracteres.';
    if (control.hasError('min') || control.hasError('max')) return 'Informe um valor dentro do limite permitido.';
    if ((name === 'minDays' || name === 'maxDays') && !Number.isInteger(control.value)) return 'Informe dias inteiros.';
    return '';
  }

  cepOrderError(): string {
    const { startCep, endCep } = this.form.getRawValue();
    return (this.submitted() || this.form.controls.endCep.touched) && startCep && endCep && startCep > endCep
      ? 'O CEP final deve ser maior ou igual ao inicial.' : '';
  }

  daysOrderError(): string {
    const { minDays, maxDays } = this.form.getRawValue();
    return (this.submitted() || this.form.controls.maxDays.touched) && minDays !== null && maxDays !== null && minDays > maxDays
      ? 'O prazo máximo deve ser maior ou igual ao mínimo.' : '';
  }

  save(): void {
    if (this.saving()) return;
    this.submitted.set(true);
    this.form.markAllAsTouched();
    this.coverageError.set('');
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
          if (closeEditor) this.editorRef?.close();
          this.alerts.success(success);
          this.load();
        },
        error: (error) => {
          const message = this.message(error);
          if (closeEditor && error instanceof HttpErrorResponse && (error.status === 409 || /sobrepo|CEP|faixa/i.test(message))) {
            this.coverageError.set(message);
          } else this.error.set(message);
        },
      });
  }

  private message(error: unknown): string {
    return error instanceof HttpErrorResponse &&
      typeof error.error?.message === 'string'
      ? error.error.message
      : 'Não foi possível concluir a operação.';
  }
}
