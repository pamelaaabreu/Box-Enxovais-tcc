import { Component } from '@angular/core';

import { MatTabsModule } from '@angular/material/tabs';

import { ProductCreateComponent } from './register/product-create/product-create.component';

import { ProductImageUploadComponent } from './images/product-image-upload/product-image-upload.component';

@Component({
  selector: 'app-product-manage',
  standalone: true,
  imports: [MatTabsModule, ProductCreateComponent, ProductImageUploadComponent],
  templateUrl: './product-manage.component.html',
  styleUrls: ['./product-manage.component.css'],
})
export class ProductManageComponent {
  selectedTabIndex = 0;

  productId: number | null = null;

  onProductCreated(id: number): void {
    this.productId = id;

    // muda automaticamente para a aba de imagens
    this.selectedTabIndex = 1;
  }
}
