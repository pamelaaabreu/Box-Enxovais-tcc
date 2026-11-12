import { Component, DestroyRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UploadService } from '../../../../core/services/upload.service';
import { ProductService } from '../../../../core/services/product.service';
import { CustomAlertService } from '../../../../core/services/custom-alert.service';

@Component({
  selector: 'app-product-image-upload',
  imports: [MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './product-image-upload.component.html',
  styleUrl: './product-image-upload.component.css',
})
export class ProductImageUploadComponent {
  @Input() productId = Number(inject(ActivatedRoute, { optional: true })?.snapshot.paramMap.get('id'));
  @Output() readonly coverChanged = new EventEmitter<string>();
  private readonly destroyRef = inject(DestroyRef);
  private readonly uploadService = inject(UploadService);
  private readonly products = inject(ProductService);
  private readonly alerts = inject(CustomAlertService);
  selectedFile: File | null = null;
  preview = '';
  images: string[] = [];
  loading = false;
  error = '';
  private readonly uploaded = new Set<string>();

  constructor() { this.destroyRef.onDestroy(() => this.clearSelection()); }

  ngOnInit(): void {
    if (!this.productId) return;
    this.products.getProduct(this.productId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: product => {
        this.images = [...new Set([...product.image_paths ?? [], ...this.images])];
        if (this.images[0]) this.coverChanged.emit(this.imageUrl(this.images[0]));
      },
      error: () => this.error = 'Não foi possível consultar as imagens cadastradas.',
    });
  }

  onFileSelected(input: HTMLInputElement): void {
    this.clearSelection();
    this.error = '';
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.error = 'Selecione uma imagem JPEG, PNG ou WebP.';
      return;
    }
    if (!file.size || file.size > 10 * 1024 * 1024) {
      this.error = 'A imagem precisa ter entre 1 byte e 10 MB.';
      return;
    }
    if (this.uploaded.has(this.fileKey(file))) {
      this.error = 'Essa imagem já foi enviada nesta sessão.';
      return;
    }
    this.selectedFile = file;
    this.preview = URL.createObjectURL(file);
  }

  clearSelection(): void {
    if (this.preview) URL.revokeObjectURL(this.preview);
    this.preview = '';
    this.selectedFile = null;
  }

  onUpload(): void {
    const file = this.selectedFile;
    if (!file || !this.productId || this.loading) return;
    const data = new FormData();
    data.append('image', file);
    data.append('productId', String(this.productId));
    this.loading = true;
    this.error = '';
    this.uploadService.uploadImage(data).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.images = [...new Set([...this.images, response.filePath.replace(/\\/g, '/')])];
        if (this.images[0]) this.coverChanged.emit(this.imageUrl(this.images[0]));
        this.uploaded.add(this.fileKey(file));
        this.clearSelection();
        this.loading = false;
        this.alerts.success('Imagem enviada com sucesso.');
      },
      error: () => {
        this.loading = false;
        this.error = 'Não foi possível enviar a imagem. Tente novamente.';
        this.alerts.error(this.error);
      },
    });
  }

  imageUrl(path: string): string {
    return /^https?:\/\//.test(path) ? path : 'http://localhost:8080/' + path.replace(/^\/+/, '');
  }

  private fileKey(file: File): string { return [file.name, file.size, file.lastModified, file.type].join(':'); }
}