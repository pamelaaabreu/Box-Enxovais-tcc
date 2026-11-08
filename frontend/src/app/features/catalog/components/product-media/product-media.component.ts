import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ProductImage } from '../../interfaces/product-image.interface';

@Component({
  selector: 'app-product-media',
  standalone: true,
  templateUrl: './product-media.component.html',
  styleUrl: './product-media.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductMediaComponent {
  readonly image = input<ProductImage | null>(null);
  readonly compact = input(false);
  readonly showCaption = input(true);
  readonly failedUrl = signal<string | null>(null);
  readonly showImage = computed(() => !!this.image()?.url && this.failedUrl() !== this.image()?.url);
  onImageError(): void { this.failedUrl.set(this.image()?.url ?? null); }
}
