import { Component, DestroyRef, Input, OnChanges, inject } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatIconModule } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService } from '../../../core/services/product.service';
import { CustomAlertService } from '../../../core/services/custom-alert.service';

@Component({
  selector: 'app-product-sku',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="sku-field">
      <label>SKU da loja<input readonly [value]="sku" [placeholder]="loading ? 'Consultando SKU…' : 'SKU indisponível'" /></label>
      @if (sku) { <button type="button" (click)="copy()" aria-label="Copiar SKU" title="Copiar SKU"><mat-icon aria-hidden="true">content_copy</mat-icon>Copiar</button> }
      @if (failed) { <p role="status">Não foi possível consultar o SKU. <button type="button" (click)="load()">Tentar novamente</button></p> }
    </div>
  `,
  styleUrl: './product-sku.component.css',
})
export class ProductSkuComponent implements OnChanges {
  @Input({ required: true }) productId!: number;
  private readonly products = inject(ProductService);
  private readonly clipboard = inject(Clipboard);
  private readonly alerts = inject(CustomAlertService);
  private readonly destroyRef = inject(DestroyRef);
  sku = '';
  loading = false;
  failed = false;
  ngOnChanges(): void { this.load(); }
  load(): void {
    const id = this.productId;
    this.sku = '';
    this.failed = false;
    if (!id) return;
    this.loading = true;
    this.products.getProduct(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: product => {
        if (this.productId !== id) return;
        this.sku = product.sku || '';
        this.failed = !this.sku;
        this.loading = false;
      },
      error: () => {
        if (this.productId !== id) return;
        this.loading = false;
        this.failed = true;
      },
    });
  }
  copy(): void {
    if (!this.sku) return;
    if (this.clipboard.copy(this.sku)) this.alerts.success('SKU copiado.');
    else this.alerts.error('Não foi possível copiar o SKU. Selecione o código e copie manualmente.');
  }
}
