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
  templateUrl: './product-sku.component.html',
  styleUrl: './product-sku.component.scss',
})
export class ProductSkuComponent implements OnChanges {
  @Input({ required: true }) productId!: number;
  @Input() compact = false;
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
