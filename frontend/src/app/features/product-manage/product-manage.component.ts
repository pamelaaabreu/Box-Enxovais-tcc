import { NgTemplateOutlet } from '@angular/common';
import { Component, viewChild } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import { ProductCreateComponent } from './register/product-create/product-create.component';

import { ProductImageUploadComponent } from './images/product-image-upload/product-image-upload.component';

@Component({
  selector: 'app-product-manage',
  standalone: true,
  imports: [NgTemplateOutlet, MatTabsModule, MatIconModule, ProductCreateComponent, ProductImageUploadComponent],
  templateUrl: './product-manage.component.html',
  styleUrls: ['./product-manage.component.css'],
})
export class ProductManageComponent {
  readonly createForm = viewChild(ProductCreateComponent);

  canLeave() { return this.createForm()?.canLeave() ?? true; }

  selectedTabIndex = 0;

  productId: number | null = null;
  previewImage = '';

  onProductCreated(id: number): void {
    this.productId = id;

    // muda automaticamente para a aba de imagens
    this.selectedTabIndex = 1;
  }
}
