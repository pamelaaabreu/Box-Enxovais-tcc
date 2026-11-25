import { Component, DestroyRef, Input, OnChanges, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminStateComponent } from '../../../../../shared/components/admin-state/admin-state.component';
import { ProductReviewService } from '../../../../../core/services/product-review.service';
import { ProductReview } from '../../../../../shared/types/product-review.types';
@Component({ selector: 'app-product-reviews', standalone: true, imports: [DatePipe, RouterLink, AdminStateComponent], templateUrl: './product-reviews.component.html', styleUrl: './product-reviews.component.scss' })
export class ProductReviewsComponent implements OnChanges {
 @Input({required: true}) productId!: number;
 private readonly service = inject(ProductReviewService); private readonly destroyRef = inject(DestroyRef); private request?: Subscription;
 readonly reviews = signal<ProductReview[]>([]); readonly loading = signal(true); readonly error = signal(false);
 constructor() { this.service.changed.pipe(takeUntilDestroyed()).subscribe(() => this.load()); }
 ngOnChanges() { this.load(); }
 load() { if (!this.productId) return; this.request?.unsubscribe(); this.loading.set(true); this.error.set(false);
  this.request = this.service.publicReviews(this.productId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: reviews => { this.reviews.set(reviews); this.loading.set(false); }, error: () => { this.error.set(true); this.loading.set(false); } });
 }
}
