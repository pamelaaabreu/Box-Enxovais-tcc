import { provideRouter } from '@angular/router';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import type { ProductImageRecord } from '../../../../../../shared/types/products/admin-product';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CustomAlertService } from '../../../../../../core/services/custom-alert.service';
import { ProductImageUploadComponent } from './product-image-upload.component';

describe('ProductImageUploadComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [ProductImageUploadComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: CustomAlertService,
          useValue: {
            success: jasmine.createSpy(),
            error: jasmine.createSpy(),
          },
        },
      ],
    }),
  );

  it('rejects non-images and oversized images, permits retry and prevents duplicate uploads', () => {
    const fixture = TestBed.createComponent(ProductImageUploadComponent);
    fixture.componentRef.setInput('productId', 42);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('http://localhost:8080/products/42')
      .flush({ image_paths: [] });
    http.expectOne('http://localhost:8080/admin/products/42/images').flush([]);
    const page = fixture.componentInstance;
    fixture.componentRef.setInput('showComplete', true);
    const completed = jasmine.createSpy('completed');
    page.completed.subscribe(completed);
    page.complete();
    expect(completed).not.toHaveBeenCalled();
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
    select(
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.png', {
        type: 'image/png',
      }),
    );
    expect(page.error).toContain('10 MB');
    page.onUpload();
    http.expectNone('http://localhost:8080/upload-image');

    const file = new File(['image'], 'test.png', { type: 'image/png' });
    select(file);
    expect(page.preview).toMatch(/^blob:/);
    page.onUpload();
    page.complete();
    expect(page.canLeave()).toBeFalse();
    expect(completed).not.toHaveBeenCalled();
    page.onUpload();
    const url = 'http://localhost:8080/upload-image';
    const failed = http.expectOne(url);
    expect(failed.request.body.get('productId')).toBe('42');
    failed.flush({}, { status: 500, statusText: 'Falha' });
    expect(page.selectedFile).toBe(file);
    page.onUpload();
    http.expectOne(url).flush({ filePath: 'uploads/test.png' });
    http.expectOne('http://localhost:8080/admin/products/42/images').flush([
      {
        id: 1,
        path: 'uploads/test.png',
        variant_id: null,
        is_primary: true,
        position: 0,
      },
    ]);
    expect(page.images).toEqual(['uploads/test.png']);
    expect(page.preview).toBe('');
    expect(completed).not.toHaveBeenCalled();
    expect(page.canLeave()).toBeTrue();
    page.complete();
    expect(completed).toHaveBeenCalledTimes(1);
    select(file);
    expect(page.error).toContain('já foi enviada');
    http.verify();
  });

  it('persists cover and ordering by image IDs and retains the gallery after conflicts', () => {
    const fixture = TestBed.createComponent(ProductImageUploadComponent);
    fixture.componentRef.setInput('productId', 42);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('http://localhost:8080/products/42')
      .flush({ variants: [{ id: 7, size: 'Queen' }] });
    const images = [
      {
        id: 1,
        path: 'uploads/one.png',
        variant_id: null,
        is_primary: true,
        position: 0,
      },
      {
        id: 2,
        path: 'uploads/two.png',
        variant_id: null,
        is_primary: false,
        position: 1,
      },
      {
        id: 3,
        path: 'uploads/queen.png',
        variant_id: 7,
        is_primary: true,
        position: 0,
      },
    ];
    const endpoint = 'http://localhost:8080/admin/products/42/images';
    http.expectOne(endpoint).flush(images);
    const page = fixture.componentInstance;
    page.moveImage(1, -1);
    const order = http.expectOne(endpoint);
    expect(order.request.method).toBe('PUT');
    expect(order.request.body).toEqual({
      variant_id: null,
      ids: [2, 1],
      expected_ids: [1, 2],
      primary_id: 2,
    });
    order.flush([images[1], images[0], images[2]]);
    expect(page.images).toEqual(['uploads/two.png', 'uploads/one.png']);
    page.setCover(images[0]);
    http
      .expectOne(endpoint)
      .flush(
        { message: 'Galeria alterada' },
        { status: 409, statusText: 'Conflict' },
      );
    expect(page.images[0]).toBe('uploads/two.png');
    expect(page.error).toBe('Galeria alterada');
    page.selectVariant({ target: { value: '7' } } as unknown as Event);
    expect(page.images).toEqual(['uploads/queen.png']);
    http.verify();
  });
  it('uploads multiple files sequentially, isolates failures and reloads the gallery', () => {
    const fixture = TestBed.createComponent(ProductImageUploadComponent);
    fixture.componentRef.setInput('productId', 42);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:8080/products/42').flush({ variants: [] });
    http.expectOne('http://localhost:8080/admin/products/42/images').flush([]);
    const page = fixture.componentInstance;
    page.enqueueFiles([
      new File(['one'], 'one.png', { type: 'image/png' }),
      new File(['two'], 'two.png', { type: 'image/png' }),
      new File(['bad'], 'bad.txt', { type: 'text/plain' }),
    ]);
    expect(page.canLeave()).toBeFalse();
    const first = http.expectOne('http://localhost:8080/upload-image');
    expect(first.request.body.get('image').name).toBe('one.png');
    first.flush({ filePath: 'uploads/one.png' });
    const second = http.expectOne('http://localhost:8080/upload-image');
    expect(second.request.body.get('image').name).toBe('two.png');
    second.flush({}, { status: 500, statusText: 'Falha' });
    http
      .expectOne('http://localhost:8080/admin/products/42/images')
      .flush([{ id: 1, path: 'uploads/one.png', variant_id: null }]);
    expect(page.uploadItems.map((item) => item.status)).toEqual([
      'done',
      'error',
      'error',
    ]);
    expect(page.loading).toBeFalse();
    expect(page.images.length).toBe(1);
    http.verify();
  });
  it('reorders dragged photos using existing image IDs and the expected snapshot', () => {
    const fixture = TestBed.createComponent(ProductImageUploadComponent);
    fixture.componentRef.setInput('productId', 42);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:8080/products/42').flush({ variants: [] });
    const images = [
      { id: 1, path: 'one.png', variant_id: null },
      { id: 2, path: 'two.png', variant_id: null },
    ];
    const endpoint = 'http://localhost:8080/admin/products/42/images';
    http.expectOne(endpoint).flush(images);
    fixture.componentInstance.dropImage({
      previousIndex: 0,
      currentIndex: 1,
    } as CdkDragDrop<ProductImageRecord[]>);
    const request = http.expectOne(endpoint);
    expect(request.request.body.ids).toEqual([2, 1]);
    expect(request.request.body.expected_ids).toEqual([1, 2]);
    request.flush([images[1], images[0]]);
    http.verify();
  });

  it('recovers the gallery and variant selector after an initial loading failure', () => {
    const fixture = TestBed.createComponent(ProductImageUploadComponent);
    fixture.componentRef.setInput('productId', 42);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:8080/products/42').flush({ variants: [] });
    http
      .expectOne('http://localhost:8080/admin/products/42/images')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    expect(fixture.componentInstance.galleryFailed).toBeTrue();
    fixture.componentInstance.retryGallery();
    http
      .expectOne('http://localhost:8080/products/42')
      .flush({ variants: [{ id: 7, size: 'Queen' }] });
    http.expectOne('http://localhost:8080/admin/products/42/images').flush([]);
    expect(fixture.componentInstance.galleryFailed).toBeFalse();
    expect(fixture.componentInstance.variants[0].id).toBe(7);
    http.verify();
  });
});
