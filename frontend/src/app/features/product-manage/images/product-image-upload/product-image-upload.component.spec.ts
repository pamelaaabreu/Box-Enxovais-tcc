import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CustomAlertService } from '../../../../core/services/custom-alert.service';
import { ProductImageUploadComponent } from './product-image-upload.component';

describe('ProductImageUploadComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [ProductImageUploadComponent],
    providers: [provideHttpClient(), provideHttpClientTesting(), {
      provide: CustomAlertService, useValue: { success: jasmine.createSpy(), error: jasmine.createSpy() },
    }],
  }));

  it('rejects non-images and oversized images, permits retry and prevents duplicate uploads', () => {
    const fixture = TestBed.createComponent(ProductImageUploadComponent);
    fixture.componentRef.setInput('productId', 42);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:8080/products/42').flush({ image_paths: [] });
    const page = fixture.componentInstance;
    const select = (file: File) => {
      const data = new DataTransfer();
      data.items.add(file);
      const input = document.createElement('input');
      input.type = 'file';
      input.files = data.files;
      page.onFileSelected(input);
    };

    select(new File(['text'], 'test.txt', { type: 'text/plain' }));
    expect(page.error).toContain('JPEG');
    select(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }));
    expect(page.error).toContain('10 MB');
    page.onUpload();
    http.expectNone('http://localhost:8080/upload-image');

    const file = new File(['image'], 'test.png', { type: 'image/png' });
    select(file);
    expect(page.preview).toMatch(/^blob:/);
    page.onUpload();
    page.onUpload();
    const url = 'http://localhost:8080/upload-image';
    const failed = http.expectOne(url);
    expect(failed.request.body.get('productId')).toBe('42');
    failed.flush({}, { status: 500, statusText: 'Falha' });
    expect(page.selectedFile).toBe(file);
    page.onUpload();
    http.expectOne(url).flush({ filePath: 'uploads/test.png' });
    expect(page.images).toEqual(['uploads/test.png']);
    expect(page.preview).toBe('');
    select(file);
    expect(page.error).toContain('já foi enviada');
    http.verify();
  });
});