import { MatIconModule } from '@angular/material/icon';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
} from '@angular/core';

import { ProductImage } from '../../../../shared/types/catalog/catalog-image';
import { ProductMediaComponent } from '../product-media/product-media.component';

@Component({
  selector: 'app-product-gallery',
  standalone: true,
  imports: [ProductMediaComponent, MatIconModule],
  templateUrl: './product-gallery.component.html',
  styleUrl: './product-gallery.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductGalleryComponent {
  readonly images = input<readonly ProductImage[]>([]);

  // Ordena as imagens sem modificar o array original.
  readonly orderedImages = computed(() =>
    [...this.images()].sort((a, b) => a.position - b.position),
  );

  move(direction: -1 | 1): void {
    const images = this.orderedImages();

    if (images.length < 2) return;

    const index = images.findIndex(
      (image) => image.id === this.selectedImage()?.id,
    );

    // Permite navegar circularmente entre as imagens.
    this.selectedId.set(
      images[(index + direction + images.length) % images.length].id,
    );
  }

  readonly selectedId = linkedSignal(() => this.orderedImages()[0]?.id ?? null);

  readonly selectedImage = computed<ProductImage | null>(
    () =>
      this.orderedImages().find((image) => image.id === this.selectedId()) ??
      this.orderedImages()[0] ??
      null,
  );
}
