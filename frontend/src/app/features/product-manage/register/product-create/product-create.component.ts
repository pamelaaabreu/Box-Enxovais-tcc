import { Component, EventEmitter, Output } from '@angular/core';

import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { Product } from '../../../../shared/models';

import { ProductService } from '../../../../core/services/product.service';

@Component({
  selector: 'app-product-create',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './product-create.component.html',
  styleUrl: './product-create.component.css',
})
export class ProductCreateComponent {
  @Output() productCreated = new EventEmitter<number>();

  loading = false;
  quantityError = '';

  validQuantity(): boolean {
    return Number.isInteger(this.product.quantity) && this.product.quantity >= 0 && this.product.quantity <= 2147483647;
  }

  product: Product = {
    name: '',
    price: 0,
    promotional_price: 0,
    quantity: 0,
    status: 'active',

    measurements: {
      casal: '',
      queen: '',
      super_king: '',
      solteiro: '',
    },

    description: '',
    care_instructions: '',
  };

  constructor(private productService: ProductService) {}

  onSubmit(form?: NgForm): void {
    if (this.loading) return;
    this.quantityError = '';
    if (!this.validQuantity()) {
      this.quantityError = 'Informe uma quantidade inteira entre 0 e 2147483647.';
      form?.control.markAllAsTouched();
      return;
    }
    if (form?.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    this.loading = true;

    this.productService.createProduct(this.product).subscribe({
      next: (response) => {
        this.loading = false;

        this.product.id = response.id;

        // envia o ID para o componente pai
        this.productCreated.emit(response.id);
      },

      error: () => {
        this.loading = false;

        alert('Erro ao criar o produto.');
      },
    });
  }
}
