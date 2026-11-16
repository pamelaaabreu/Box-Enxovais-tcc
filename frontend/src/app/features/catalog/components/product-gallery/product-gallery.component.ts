import { MatIconModule } from '@angular/material/icon';
import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { ProductImage } from '../../interfaces/product-image.interface';
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
  readonly orderedImages = computed(() => [...this.images()].sort((a, b) => a.position - b.position));
  readonly selectedId = linkedSignal(() => this.orderedImages()[0]?.id ?? null);
  readonly selectedImage = computed<ProductImage | null>(() => this.orderedImages().find(image => image.id === this.selectedId()) ?? this.orderedImages()[0] ?? null);
}
