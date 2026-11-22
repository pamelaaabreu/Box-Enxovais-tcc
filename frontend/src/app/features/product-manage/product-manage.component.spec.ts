import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ProductManageComponent } from './product-manage.component';
import { ProductImageUploadComponent } from './images/product-image-upload/product-image-upload.component';
import { ProductSkuComponent } from '../../shared/components/product-sku/product-sku.component';

describe('Product creation navigation', () => {
  it('stays on images until completion and returns using the real SKU and product ID', () => {
    TestBed.configureTestingModule({ imports: [ProductManageComponent], providers: [provideRouter([])] });
    TestBed.overrideComponent(ProductManageComponent, { set: { template: '' } });
    const page = TestBed.createComponent(ProductManageComponent).componentInstance;
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const gallery = { loading: false, selectedFile: null as File | null, images: [] as string[], canLeave: () => true };
    spyOn(page, 'gallery').and.returnValue(gallery as unknown as ProductImageUploadComponent);
    spyOn(page, 'sku').and.returnValue({ sku: 'BX-EDR-098' } as ProductSkuComponent);
    page.onProductCreated(98);
    expect(page.selectedTabIndex).toBe(1);
    expect(navigate).not.toHaveBeenCalled();
    page.complete();
    expect(navigate).not.toHaveBeenCalled();
    gallery.images.push('uploads/test.webp');
    gallery.loading = true;
    page.complete();
    gallery.loading = false;
    gallery.selectedFile = new File(['image'], 'next.png');
    page.complete();
    expect(navigate).not.toHaveBeenCalled();
    gallery.selectedFile = null;
    page.complete();
    expect(navigate).toHaveBeenCalledOnceWith(['/admin/products'], { queryParams: { q: 'BX-EDR-098', created: 98 } });
  });
});
