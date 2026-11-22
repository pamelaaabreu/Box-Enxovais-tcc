import { Product } from '../../shared/models';
import { isObservable, of, switchMap } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductSkuComponent } from '../../shared/components/product-sku/product-sku.component';
import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, viewChild } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import { ProductCreateComponent } from './register/product-create/product-create.component';

import { ProductImageUploadComponent } from './images/product-image-upload/product-image-upload.component';

@Component({
  selector: 'app-product-manage',
  standalone: true,
  imports: [RouterLink,ProductSkuComponent,
    NgTemplateOutlet,
    MatTabsModule,
    MatIconModule,
    ProductCreateComponent,
    ProductImageUploadComponent,
  ],
  templateUrl: './product-manage.component.html',
  styleUrls: ['./product-manage.component.scss'],
})
export class ProductManageComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute, {optional:true});
  readonly editId = Number(this.route?.snapshot.paramMap.get('id')) || null;
  readonly gallery = viewChild(ProductImageUploadComponent);
  readonly sku = viewChild(ProductSkuComponent);
  readonly createForm = viewChild(ProductCreateComponent);

  canLeave() {
    const form=this.createForm()?.canLeave() ?? true;
    if(form===false)return false;
    const gallery=()=>this.gallery()?.canLeave() ?? true;
    if(isObservable(form))return form.pipe(switchMap(allowed=>{if(!allowed)return of(false);const result=gallery();return isObservable(result)?result:of(result);}));
    return gallery();
  }

  selectedTabIndex = this.route?.snapshot.url.at(-1)?.path === 'images' ? 1 : 0;

  productId: number | null = this.editId;
  previewImage = '';

  complete(): void {
    const gallery = this.gallery();
    if (!this.productId || !gallery || gallery.loading || gallery.selectedFile || (!this.editId && !gallery.images.length)) return;
    const search = this.sku()?.sku || this.createForm()?.fields.name.value || '';
    void this.router.navigate(['/admin/products'], { queryParams: { q: search, ...(!this.editId ? {created: this.productId} : {}) } });
  }

  onProductLoaded(product:Product):void {
    const path=product.image_paths?.[0];
    this.previewImage=path ? (/^https?:\/\//.test(path) ? path : 'http://localhost:8080/'+path.replace(/^\/+/,'') ) : '';
  }

  onProductUpdated():void {
    void this.router.navigate(['/admin/products'], {queryParams:{q:this.createForm()?.fields.name.value||''}});
  }

  onProductCreated(id: number): void {
    this.productId = id;

    // muda automaticamente para a aba de imagens
    this.selectedTabIndex = 1;
  }
}
