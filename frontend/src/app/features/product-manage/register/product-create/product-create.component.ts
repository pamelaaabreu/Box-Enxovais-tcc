import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  TemplateRef,
  inject,
  viewChild,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, map, tap, throwError } from 'rxjs';
import { ProductService } from '../../../../core/services/product.service';
import { CustomAlertService } from '../../../../core/services/custom-alert.service';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';

const money = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function parsePrice(text: string): number | null {
  const value = text.trim().replace(/^R\$\s*/, '');
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(value)) return null;
  const amount = Number(value.replace(/\./g, '').replace(',', '.'));
  return amount > 0 && amount <= 99999999.99 ? amount : null;
}

function measurementFields(fb: FormBuilder) {
  return fb.nonNullable.group({
    label: [
      '',
      [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(100),
      ],
    ],
    value: [
      '',
      [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(120),
      ],
    ],
  });
}

@Component({
  selector: 'app-product-create',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    RouterLink,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,

  ],
  templateUrl: './product-create.component.html',

  styleUrl: './product-create.component.scss',
})
export class ProductCreateComponent {
  @Input() previewImage = '';
  @Input() externalSummary = false;
  readonly summary = viewChild<TemplateRef<unknown>>('summary');
  @Output() productCreated = new EventEmitter<number>();
  private readonly fb = inject(FormBuilder);
  private readonly products = inject(ProductService);
  private readonly alerts = inject(CustomAlertService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly labels: Record<string, string> = {
    active: 'Ativo',
    inactive: 'Inativo',
    archived: 'Arquivado',
  };
  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(/\S/),
      Validators.maxLength(100),
    ]),
    description: this.fb.nonNullable.control(''),
    category: this.fb.control<number | null>(null, Validators.required),
    brand: this.fb.control<number | null>(null),
    status: this.fb.nonNullable.control('active', (c) =>
      Object.hasOwn(this.labels, c.value) ? null : { status: true },
    ),
    price: this.fb.nonNullable.control('', [
      Validators.required,
      (c) => (parsePrice(c.value) === null ? { money: true } : null),
    ]),
    quantity: this.fb.control<number | null>(null, [
      Validators.required,
      (c) =>
        Number.isInteger(c.value) && c.value >= 0 && c.value <= 2147483647
          ? null
          : { stock: true },
    ]),
    material: this.fb.nonNullable.control('', Validators.maxLength(120)),
    size: this.fb.nonNullable.control('', Validators.maxLength(120)),
    color: this.fb.nonNullable.control('', Validators.maxLength(120)),
    care: this.fb.nonNullable.control(''),
    measurements: new FormArray<ReturnType<typeof measurementFields>>([]),
  }, { validators: control => {
    const value = control.getRawValue();
    const names = [
      ...(value.material.trim() ? ['Material'] : []),
      ...(value.size.trim() ? ['Tamanho'] : []),
      ...(value.color.trim() ? ['Cor'] : []),
      ...value.measurements.map((entry: { label: string }) => entry.label),
    ].map(name => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')).filter(Boolean);
    return new Set(names).size === names.length ? null : { duplicateCharacteristic: true };
  } });
  readonly fields = this.form.controls;
  readonly checklist = [
    { label: 'Status definido', control: this.fields.status },
    { label: 'Nome do produto', control: this.fields.name },
    { label: 'Categoria', control: this.fields.category },
    { label: 'Preço', control: this.fields.price },
    { label: 'Estoque', control: this.fields.quantity },
  ];
  categories: readonly { id: number; name: string }[] = [];
  brands: readonly { id: number; name: string }[] = [];
  optionsUnavailable = false;
  loadingOptions = false;
  loading = false;
  savedId: number | null = null;
  readonly registrationName = this.fb.nonNullable.control('', [
    Validators.required, Validators.pattern(/\S/), Validators.maxLength(100),
  ]);
  registrationApiError = '';
  registrationKind: 'categories' | 'brands' = 'categories';
  private readonly registrationContent = viewChild.required<TemplateRef<unknown>>('registrationContent');

  constructor() {
    this.loadOptions();
  }

  loadOptions(): void {
    if (this.loadingOptions) return;
    this.optionsUnavailable = false;
    this.loadingOptions = true;
    forkJoin([this.products.getProductTypes(), this.products.getBrands()])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ([categories, brands]) => {
          this.categories = categories;
          this.brands = brands;
          if (
            !categories.some((item) => item.id === this.fields.category.value)
          )
            this.fields.category.reset();
          if (!brands.some((item) => item.id === this.fields.brand.value))
            this.fields.brand.reset();
          this.loadingOptions = false;
        },
        error: () => {
          this.optionsUnavailable = true;
          this.loadingOptions = false;
        },
      });
  }

  openRegistration(kind: 'categories' | 'brands'): void {
    if (this.loadingOptions || this.loading || this.savedId) return;
    this.registrationKind = kind;
    this.registrationApiError = '';
    this.registrationName.reset();
    const category = kind === 'categories';
    const noun = category ? 'categoria' : 'marca';
    let created: { id: number; name: string } | undefined;
    this.confirm.open({
      title: category ? 'Nova categoria' : 'Nova marca',
      message: category ? 'Adicione uma categoria para organizar seus produtos.' : 'Cadastre uma marca para associá-la aos produtos.',
      variant: 'info',
      icon: category ? 'category' : 'sell',
      primary: 'Cadastrar ' + noun,
      secondary: 'Cancelar',
      disableClose: true,
      content: this.registrationContent(),
      execute: () => {
        this.registrationApiError = '';
        if (this.registrationName.invalid) {
          this.registrationName.markAsTouched();
          return throwError(() => new Error('invalid name'));
        }
        const name = this.registrationName.value.trim().replace(/\s+/g, ' ');
        return this.products.createCatalogRegistration(kind, name).pipe(tap(item => created = item));
      },
      errorMessage: error => {
        if (this.registrationName.invalid) return '';
        const status = (error as { status?: number })?.status;
        if (status === 409) {
          this.registrationApiError = category ? 'Essa categoria já está cadastrada.' : 'Essa marca já está cadastrada.';
          return '';
        }
        if (status === 400) return 'Confira o nome informado e tente novamente.';
        if (status === 0) return 'Não foi possível conectar ao servidor. Tente novamente.';
        return 'Não foi possível concluir o cadastro. Tente novamente.';
      },
    }, { width: '450px', panelClass: 'box-quick-registration-panel' }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmed => {
      if (confirmed !== true || !created) return;
      const item = created;
      if (category) this.categories = [...this.categories.filter(option => option.id !== item.id), item];
      else this.brands = [...this.brands.filter(option => option.id !== item.id), item];
      const control = category ? this.fields.category : this.fields.brand;
      control.setValue(item.id);
      control.markAsDirty();
      this.alerts.success(category ? 'Categoria cadastrada.' : 'Marca cadastrada.');
    });
  }

  get registrationError(): string {
    if (this.registrationApiError) return this.registrationApiError;
    if (!this.registrationName.touched) return '';
    if (this.registrationName.hasError('required')) {
      return this.registrationKind === 'categories' ? 'Informe o nome da categoria.' : 'Informe o nome da marca.';
    }
    if (this.registrationName.hasError('maxlength')) return 'O nome deve ter até 100 caracteres.';
    return this.registrationName.invalid ? 'Informe um nome válido.' : '';
  }

  get progress(): number {
    return this.checklist.filter((item) => item.control.valid).length * 20;
  }
  get pricePreview(): string {
    return currency.format(parsePrice(this.fields.price.value) ?? 0);
  }
  get previewContext(): string {
    const category = this.categories.find(
      (item) => item.id === this.fields.category.value,
    )?.name;
    const brand = this.brands.find(
      (item) => item.id === this.fields.brand.value,
    )?.name;
    return [category || 'Categoria ainda não selecionada', brand].filter(Boolean).join(' · ');
  }
  fieldState(control: AbstractControl): string {
    if (control.valid || (this.savedId && !control.errors)) return 'Completo';
    return control.touched || (control.value !== null && control.value !== '')
      ? 'Inválido'
      : 'Pendente';
  }

  formatPrice(): void {
    const amount = parsePrice(this.fields.price.value);
    if (amount !== null) this.fields.price.setValue(money.format(amount));
  }

  addMeasurement(): void {
    this.fields.measurements.push(measurementFields(this.fb));
    this.form.markAsDirty();
  }

  removeMeasurement(index: number): void {
    this.fields.measurements.removeAt(index);
    this.form.markAsDirty();
  }

  canLeave() {
    if (this.loading) return false;
    if (this.savedId || !this.form.dirty) return true;
    return this.confirm
      .open({
        title: 'Descartar alterações?',
        message: 'Os dados ainda não foram salvos.',
        variant: 'warning',
        primary: 'Continuar editando',
        secondary: 'Descartar',
        confirmAction: 'secondary',
      })
      .afterClosed()
      .pipe(map((result) => result === true));
  }

  onSubmit(draft = false): void {
    if (this.loading || this.savedId || this.loadingOptions) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const measurements = Object.fromEntries(
      value.measurements.map((entry) => [
        entry.label.trim(),
        entry.value.trim(),
      ]),
    );
    for (const [label, text] of Object.entries({
      Material: value.material,
      Tamanho: value.size,
      Cor: value.color,
    })) {
      const content = text.trim();
      if (content) measurements[label] = content;
    }
    this.loading = true;
    this.products
      .createProduct({
        name: value.name.trim(),
        description: value.description,
        product_type_id: value.category!,
        brand_id: value.brand ?? undefined,
        status: draft ? 'inactive' : value.status,
        price: parsePrice(value.price)!,
        quantity: value.quantity!,
        measurements,
        care_instructions: value.care,
        promotional_price: 0,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ id }) => {
          this.loading = false;
          this.savedId = id;
          this.form.markAsPristine();
          this.alerts.success(
            draft
              ? 'Rascunho salvo como produto inativo.'
              : 'Produto cadastrado com sucesso.',
          );
          if (draft) void this.router.navigate(['/admin/products']);
          else this.productCreated.emit(id);
        },
        error: () => {
          this.loading = false;
          this.alerts.error(
            'Não foi possível cadastrar o produto. Tente novamente.',
          );
        },
      });
  }
}
