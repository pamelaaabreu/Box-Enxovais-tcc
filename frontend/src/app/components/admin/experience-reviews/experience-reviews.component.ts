import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { AdminStateComponent } from '../../../shared/components/admin-state/admin-state.component';
import { AdminPageHeaderComponent } from '../../../shared/components/admin-page-header/admin-page-header.component';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { CustomAlertService } from '../../../core/services/custom-alert.service';
import type { ExperienceReview as Review } from '../../../shared/types/experience-review.types';

@Component({
  selector: 'app-experience-reviews',
  standalone: true,
  imports: [StatusBadgeComponent,
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
  private readonly http = inject(HttpClient);
  private readonly alerts = inject(CustomAlertService);
  readonly reviews = signal<Review[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly pending = signal(0);
  readonly page = signal(1);

  constructor() {
    this.load();
  }

  load() {
    this.readRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.readRequest = this.http
      .get<Review[]>('http://localhost:8080/admin/experience-reviews')
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

  moderate(review: Review, status: Review['status']) {
    if (this.pending()) return;
    this.pending.set(review.id);
    this.http
      .patch('http://localhost:8080/admin/experience-reviews/' + review.id, {
        status,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.reviews.update((v) =>
            v.map((r) => (r.id === review.id ? { ...r, status } : r)),
          );
          this.pending.set(0);
          this.alerts.success('Avaliação atualizada');
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
