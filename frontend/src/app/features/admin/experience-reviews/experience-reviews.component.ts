import { Observable, map } from 'rxjs';
import { ProductReviewService } from '../../../core/services/product-review.service';
import { ProductReview } from '../../../shared/types/product-review.types';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { AdminStateComponent } from '../../../shared/components/admin-state/admin-state.component';
import { AdminPageHeaderComponent } from '../../../shared/components/admin-page-header/admin-page-header.component';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ExperienceReviewService } from './services/experience-review.service';
import { DatePipe } from '@angular/common';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { CustomAlertService } from '../../../core/services/custom-alert.service';
import type { ExperienceReview as Review } from '../../../shared/types/experience-review.types';

@Component({
  selector: 'app-experience-reviews',
  standalone: true,
  imports: [
    StatusBadgeComponent,
    AdminStateComponent,
    AdminPageHeaderComponent,
    DatePipe,
    PaginationComponent,
  ],
  templateUrl: './experience-reviews.component.html',
  styleUrl: './experience-reviews.component.scss',
})
export class ExperienceReviewsComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readRequest?: Subscription;
  private readonly purchaseReviews = inject(ExperienceReviewService);
  private readonly alerts = inject(CustomAlertService);
  readonly kind = signal<'purchase' | 'product'>('purchase');
  readonly productReviews = inject(ProductReviewService);
  readonly reviews = signal<(Review & { product?: ProductReview })[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly pending = signal(0);
  readonly page = signal(1);

  constructor() {
    this.load();
  }

  changeKind(kind: 'purchase' | 'product') {
    if (this.pending() || this.kind() === kind) return;
    this.kind.set(kind);
    this.page.set(1);
    this.load();
  }
  load() {
    this.readRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    const request: Observable<(Review & { product?: ProductReview })[]> =
      this.kind() === 'product'
        ? this.productReviews.admin().pipe(
            map((items) =>
              items.map((product) => ({
                id: product.id,
                orderId: product.orderId ?? 0,
                overall: product.rating,
                navigation: null,
                service: null,
                experience: null,
                comment: product.comment,
                publicationConsent: product.publicationConsent,
                status: product.status!,
                createdAt: product.createdAt,
                product,
              })),
            ),
          )
        : this.purchaseReviews.list();
    this.readRequest = request
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (v) => {
          this.reviews.set(v);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Não foi possível carregar as avaliações.');
          this.loading.set(false);
        },
      });
  }

  moderate(
    review: Review & { product?: ProductReview },
    status: Review['status'],
  ) {
    if (this.pending() || (status === 'approved' && !review.publicationConsent))
      return;
    this.pending.set(review.id);
    const request = review.product
      ? this.productReviews.moderate(review.product, status)
      : this.purchaseReviews.moderate(review.id, status);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.reviews.update((v) =>
          v.map((r) => (r.id === review.id ? { ...r, status } : r)),
        );
        this.pending.set(0);
        this.alerts.success('Avaliação atualizada');
        if (review.product) this.load();
      },
      error: (e: HttpErrorResponse) => {
        this.pending.set(0);
        this.alerts.error(
          'Não foi possível atualizar',
          e.error?.message || 'Tente novamente.',
        );
      },
    });
  }
}
