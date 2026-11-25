import {
  Component,
  DestroyRef,
  Input,
  OnChanges,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReviewSummaryState } from '../../../../../shared/types/product-review.types';
import { ProductRatingComponent } from '../../../../../shared/components/product-rating/product-rating.component';
import { computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminStateComponent } from '../../../../../shared/components/admin-state/admin-state.component';
import { ProductReviewService } from '../../../../../core/services/product-review.service';
import { ProductReview } from '../../../../../shared/types/product-review.types';
@Component({
  selector: 'app-product-reviews',
  standalone: true,
  imports: [
    ProductRatingComponent,
    DecimalPipe,
    DatePipe,
    RouterLink,
    AdminStateComponent,
  ],
  templateUrl: './product-reviews.component.html',
  styleUrl: './product-reviews.component.scss',
})
export class ProductReviewsComponent implements OnChanges {
  @Input({ required: true }) productId!: number;
  readonly service = inject(ProductReviewService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  readonly reviews = signal<ProductReview[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly summary = computed<ReviewSummaryState | undefined>(
    () => this.service.summaries()[this.productId],
  );
  count(rating: number): number {
    return (
      this.summary()?.distribution?.[rating - 1] ??
      this.reviews().filter((r) => r.rating === rating).length
    );
  }
  percent(rating: number): number {
    const count = this.summary()?.count ?? this.reviews().length;
    return count ? (this.count(rating) * 100) / count : 0;
  }

  constructor() {
    this.service.changed
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.load());
  }
  ngOnChanges() {
    this.load();
  }
  load() {
    if (!this.productId) return;
    this.service.ensureSummary(this.productId, true);
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(false);
    this.request = this.service
      .publicReviews(this.productId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reviews) => {
          this.reviews.set(reviews);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }
}
