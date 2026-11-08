import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ProductImage } from '../../interfaces/product-image.interface';
import { ProductMediaComponent } from '../product-media/product-media.component';

@Component({
  selector: 'app-product-gallery',
  standalone: true,
  imports: [ProductMediaComponent],
  templateUrl: './product-gallery.component.html',
  styleUrl: './product-gallery.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductGalleryComponent {
  readonly images = input<readonly ProductImage[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly orderedImages = computed(() => [...this.images()].sort((a, b) => a.position - b.position));
  readonly selectedImage = computed<ProductImage | null>(() => this.orderedImages().find(image => image.id === this.selectedId()) ?? this.orderedImages()[0] ?? null);
}
