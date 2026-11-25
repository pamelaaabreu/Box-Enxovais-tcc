import { ReviewSummaryState } from '../../types/product-review.types';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { ProductReviewService } from '../../../core/services/product-review.service';
@Component({
  selector: 'app-product-rating',
  standalone: true,
  templateUrl: './product-rating.component.html',
  styleUrl: './product-rating.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductRatingComponent {
  readonly productId = input.required<number>();
  readonly reviews = inject(ProductReviewService);
  readonly state = computed<ReviewSummaryState | undefined>(
    () => this.reviews.summaries()[this.productId()],
  );
  readonly average = computed(() =>
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(this.state()?.average ?? 0),
  );
  constructor() {
    effect(() => {
      const id = this.productId();
      untracked(() => this.reviews.ensureSummary(id));
    });
  }
}
