import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { forkJoin, Subscription } from 'rxjs';
import { AdminStateComponent } from '../../../shared/components/admin-state/admin-state.component';
import { InlineNoticeComponent } from '../../../shared/components/inline-notice/inline-notice.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ProductReviewFormComponent } from '../product-review-form/product-review-form.component';
import { ProductReviewService } from '../../../core/services/product-review.service';
import {
  ProductReview,
  ReviewableProduct,
} from '../../../shared/types/product-review.types';
@Component({
  selector: 'app-my-reviews',
  standalone: true,
  imports: [
    DatePipe,
    AdminStateComponent,
    InlineNoticeComponent,
    PaginationComponent,
    ProductReviewFormComponent,
  ],
  templateUrl: './my-reviews.component.html',
  styleUrl: './my-reviews.component.scss',
})
export class MyReviewsComponent {
  readonly service = inject(ProductReviewService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  readonly reviews = signal<ProductReview[]>([]);
  readonly products = signal<ReviewableProduct[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly notice = signal('');
  readonly page = signal(1);
  readonly editing = signal<ProductReview | null>(null);
  readonly selected = signal<ReviewableProduct | null>(null);
  constructor() {
    this.load();
  }
  load() {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(false);
    this.request = forkJoin({
      reviews: this.service.mine(),
      products: this.service.reviewable(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (value) => {
          this.reviews.set(value.reviews);
          this.products.set(value.products);
          this.page.set(1);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
  edit(review: ProductReview) {
    this.editing.set(review);
    this.selected.set(review);
    this.notice.set('');
  }
  start(product: ReviewableProduct) {
    this.editing.set(null);
    this.selected.set(product);
    this.notice.set('');
  }
  cancel() {
    this.editing.set(null);
    this.selected.set(null);
  }
  saved() {
    this.cancel();
    this.notice.set('Avaliação salva e enviada para moderação.');
    this.load();
  }
}
