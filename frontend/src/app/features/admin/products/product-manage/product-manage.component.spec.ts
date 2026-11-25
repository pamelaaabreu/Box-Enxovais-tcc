import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { ProductService } from '../../../../core/services/product.service';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ProductManageComponent } from './product-manage.component';
import { ProductImageUploadComponent } from './images/product-image-upload/product-image-upload.component';
import { ProductSkuComponent } from '../../../../shared/components/product-sku/product-sku.component';

describe('Product creation navigation', () => {
  it('stays on images until completion and returns using the real SKU and product ID', () => {
    TestBed.configureTestingModule({
      imports: [ProductManageComponent],
      providers: [provideRouter([])],
    });
    TestBed.overrideComponent(ProductManageComponent, {
      set: { template: '' },
    });
    const page = TestBed.createComponent(
      ProductManageComponent,
    ).componentInstance;
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(
      true,
    );
    const gallery = {
      loading: false,
      selectedFile: null as File | null,
      images: [] as string[],
      canLeave: () => true,
    };
    spyOn(page, 'gallery').and.returnValue(
      gallery as unknown as ProductImageUploadComponent,
    );
    spyOn(page, 'sku').and.returnValue({
      sku: 'BX-EDR-098',
    } as ProductSkuComponent);
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
    expect(navigate).toHaveBeenCalledOnceWith(['/admin/produtos'], {
      queryParams: { q: 'BX-EDR-098', created: 98 },
    });
  });
  it('reuses the same reactive variants array across the Material tabs', async () => {
    const product = {
      id: 12,
      name: 'Edredom de teste',
      sku: 'BX-EDR-012',
      description: 'Produto completo para teste',
      product_type_id: 1,
      brand_id: 1,
      price: 249.9,
      quantity: 3,
      status: 'active',
      measurements: {},
      image_paths: [],
      variants: [
        {
          id: 31,
          size: 'Queen',
          dimensions: '240 × 260 cm',
          price: 249.9,
          stock: 3,
        },
      ],
    };
    TestBed.configureTestingModule({
      imports: [ProductManageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideNoopAnimations(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: '12' }),
              url: [{ path: 'edit' }],
            },
          },
        },
        {
          provide: ProductService,
          useValue: {
            getAdminProduct: () => of(product),
            getProduct: () => of(product),
            getProductImages: () => of([]),
            getProductTypes: () => of([{ id: 1, name: 'Cama' }]),
            getBrands: () => of([{ id: 1, name: 'Marca' }]),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(ProductManageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const form = component.createForm()!;
    const variants = form.fields.variants;
    expect(
      fixture.nativeElement.querySelectorAll('app-admin-page-header').length,
    ).toBe(1);
    expect(
      fixture.nativeElement.querySelector('app-admin-page-header h1')
        ?.textContent,
    ).toBe('Editar produto');
    expect(
      fixture.nativeElement
        .querySelector('app-admin-page-header nav a')
        ?.getAttribute('href'),
    ).toBe('/admin/produtos');
    expect(fixture.nativeElement.querySelectorAll('[role="tab"]').length).toBe(
      3,
    );
    component.selectedTabIndex = 2;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelectorAll('app-product-variants').length,
    ).toBe(1);
    variants.at(0).controls.price.setValue('299,90');
    variants.markAsDirty();
    component.selectedTabIndex = 0;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.createForm()).toBe(form);
    expect(form.fields.variants).toBe(variants);
    expect(variants.at(0).controls.price.value).toBe('299,90');
    expect(component.productName).toBe(product.name);
  });
});
