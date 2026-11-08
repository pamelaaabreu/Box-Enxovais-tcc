import { TestBed } from '@angular/core/testing';
import { ProductGalleryComponent } from './product-gallery.component';

describe('ProductGalleryComponent', () => {
  it('supports products without images', () => {
    const fixture = TestBed.createComponent(ProductGalleryComponent);
    expect(fixture.componentInstance.selectedImage()).toBeNull();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Imagem em preparação');
  });
  it('orders images, switches selection and resets for a new product', () => {
    const fixture = TestBed.createComponent(ProductGalleryComponent);
    const image = { id: 1, url: '', alt: 'Primeira', position: 0 };
    fixture.componentRef.setInput('images', [{ ...image, id: 2, position: 1 }, image]);
    expect(fixture.componentInstance.selectedImage()?.id).toBe(1);
    fixture.componentInstance.selectedId.set(2);
    expect(fixture.componentInstance.selectedImage()?.id).toBe(2);
    fixture.componentRef.setInput('images', [{ ...image, id: 3 }]);
    expect(fixture.componentInstance.selectedImage()?.id).toBe(3);
  });
});
