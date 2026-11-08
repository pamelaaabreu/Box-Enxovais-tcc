import { Component, Input } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { UploadService } from '../../../../core/services/upload.service';

@Component({
  selector: 'app-product-image-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-image-upload.component.html',
  styleUrl: './product-image-upload.component.css',
})
export class ProductImageUploadComponent {
  @Input() productId!: number;

  selectedFile: File | null = null;

  uploadResponse = '';

  constructor(private uploadService: UploadService) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onUpload(): void {
    if (!this.selectedFile) {
      alert('Por favor, selecione uma imagem.');
      return;
    }

    const formData = new FormData();

    formData.append('image', this.selectedFile, this.selectedFile.name);

    formData.append('productId', this.productId.toString());

    this.uploadService.uploadImage(formData).subscribe({
      next: (res) => {
        this.uploadResponse = `Imagem enviada com sucesso!`;
      },

      error: (err) => {
        console.error(err);

        this.uploadResponse = 'Erro ao enviar imagem.';
      },
    });
  }
}
