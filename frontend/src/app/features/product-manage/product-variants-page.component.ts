import { ProductCommerceSummaryComponent } from '../../shared/components/product-commerce-summary/product-commerce-summary.component';
import {
  maskPriceInput,
  money,
  parsePrice,
} from '../../shared/forms/price-input';
import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService } from '../../core/services/product.service';
import { CustomAlertService } from '../../core/services/custom-alert.service';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.service';
import { AdminPageHeaderComponent } from '../../shared/components/admin-page-header/admin-page-header.component';
import { AdminStateComponent } from '../../shared/components/admin-state/admin-state.component';
import { ProductSkuComponent } from '../../shared/components/product-sku/product-sku.component';
import {
  ProductVariantsComponent,
  ProductVariant,
  variantsArray,
  variantForm,
  variantPayload,
} from '../../shared/components/product-variants/product-variants.component';
import { Product } from '../../shared/models';
import { map } from 'rxjs';

@Component({
  selector: 'app-product-variants-page',
  standalone: true,
  imports: [
    ProductCommerceSummaryComponent,
    ReactiveFormsModule,
    RouterLink,
    AdminPageHeaderComponent,
    AdminStateComponent,
    ProductSkuComponent,
    ProductVariantsComponent,
  ],
  templateUrl: './product-variants-page.component.html',
  styleUrls: ['../../components/admin/catalog-registration.component.scss', './product-variants-page.component.scss'],
})
export class ProductVariantsPageComponent {
  private readonly products = inject(ProductService);
  private readonly alerts = inject(CustomAlertService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);
  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  readonly variants = variantsArray();
  readonly form = new FormGroup({
    variants: this.variants,
    price: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        (c) => (parsePrice(c.value) === null ? { money: true } : null),
      ],
    }),
    quantity: new FormControl<number | null>(null, [
      Validators.required,
      (c) =>
        Number.isInteger(c.value) && c.value >= 0 && c.value <= 2147483647
          ? null
          : { stock: true },
    ]),
  });
  private expectedPrice = 0;
  private expectedQuantity = 0;
  mask(event: Event): void {
    maskPriceInput(event, this.form.controls.price);
  }
  private syncMode(): void {
    for (const control of [
      this.form.controls.price,
      this.form.controls.quantity,
    ]) {
      if (this.variants.length) control.disable({ emitEvent: false });
      else control.enable({ emitEvent: false });
    }
  }
  product: Product | null = null;
  expected: ProductVariant[] = [];
  loading = false;
  saving = false;
  error = '';
  constructor() {
    this.variants.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncMode());
    this.load();
  }
  private fill(items: ProductVariant[]): void {
    this.variants.clear({ emitEvent: false });
    for (const item of items)
      this.variants.push(variantForm(item), { emitEvent: false });
    this.expected = items.map((v) => ({ ...v }));
    this.syncMode();
    this.form.markAsPristine();
  }
  load(): void {
    if (this.loading || this.saving) return;
    if (!Number.isInteger(this.id) || this.id <= 0) {
      this.error = 'Produto inválido.';
      return;
    }
    this.loading = true;
    this.error = '';
    this.products
      .getProduct(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (product) => {
          this.product = product;
          this.expectedPrice = product.price;
          this.expectedQuantity = product.quantity;
          this.form.patchValue(
            { price: money.format(product.price), quantity: product.quantity },
            { emitEvent: false },
          );
          this.fill(product.variants ?? []);
          this.loading = false;
        },
        error: () => {
          this.error = 'Tente novamente para consultar as variações.';
          this.loading = false;
        },
      });
  }
  save(): void {
    if (this.saving || this.loading || !this.form.dirty) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = '';
    this.products
      .saveVariants(
        this.id,
        variantPayload(this.variants),
        this.expected,
        this.variants.length
          ? undefined
          : {
              price: parsePrice(this.form.controls.price.value)!,
              quantity: this.form.controls.quantity.value!,
              expected_price: this.expectedPrice,
              expected_quantity: this.expectedQuantity,
            },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (!result.variants.length) {
            this.expectedPrice = parsePrice(this.form.controls.price.value)!;
            this.expectedQuantity = this.form.controls.quantity.value!;
          }
          this.fill(result.variants);
          this.saving = false;
          this.alerts.success('Variações salvas.');
        },
        error: (err) => {
          this.saving = false;
          this.error =
            err.error?.message ||
            'Não foi possível salvar as variações. Tente novamente.';
        },
      });
  }
  canLeave() {
    if (this.saving) return false;
    if (!this.form.dirty) return true;
    return this.confirm
      .open({
        title: 'Descartar alterações?',
        message: 'As variações ainda não foram salvas.',
        variant: 'warning',
        primary: 'Continuar editando',
        secondary: 'Descartar',
        confirmAction: 'secondary',
      })
      .afterClosed()
      .pipe(map((result) => result === true));
  }
  reload(): void {
    const decision = this.canLeave();
    if (decision === true) this.load();
    else if (decision !== false)
      decision.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((ok) => {
        if (ok) this.load();
      });
  }
}
