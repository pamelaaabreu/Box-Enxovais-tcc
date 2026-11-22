import { AdminStateComponent } from '../../shared/components/admin-state/admin-state.component';
import { InlineNoticeComponent } from '../../shared/components/inline-notice/inline-notice.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { Component, DestroyRef, Input, OnChanges, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-purchase-review', standalone: true, imports: [AdminStateComponent, InlineNoticeComponent,ReactiveFormsModule, MatIconModule],
  templateUrl: './purchase-review.component.html', styleUrl: './purchase-review.component.scss',
})
export class PurchaseReviewComponent implements OnChanges {
  @Input({required: true}) orderId!: number;
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readRequest?: Subscription;
  private writeRequest?: Subscription;
  private loadedOrderId = 0;
  readonly readError = signal(false);
  readonly unavailable = signal(false);
  readonly loading = signal(true);
  readonly sending = signal(false);
  readonly saved = signal('');
  readonly submitError = signal('');
  readonly hoveredRating = signal(0);
  readonly ratings = [1, 2, 3, 4, 5];
  readonly form = inject(FormBuilder).nonNullable.group({
    overall: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
    comment: ['', Validators.maxLength(1000)], publicationConsent: false,
  });

  ngOnChanges(): void {
    if (this.loadedOrderId !== this.orderId) {
      this.writeRequest?.unsubscribe(); this.sending.set(false);
      this.form.reset(); this.hoveredRating.set(0); this.submitError.set('');
      this.loadedOrderId = this.orderId;
    }
    this.loadReview();
  }

  loadReview(): void {
    this.readRequest?.unsubscribe(); this.readError.set(false); this.unavailable.set(false);
    this.loading.set(true); this.saved.set('');
    if (!Number.isSafeInteger(this.orderId) || this.orderId < 1) {
      this.loading.set(false); this.unavailable.set(true); return;
    }
    this.readRequest = this.http.get<{status: string} | null>('http://localhost:8080/orders/' + this.orderId + '/review')
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: review => {
          this.loading.set(false);
          if (review) this.saved.set('Você já avaliou este pedido. Obrigado por compartilhar sua experiência.');
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          if (error.status === 404 || error.status === 403) this.unavailable.set(true);
          else this.readError.set(true);
        },
      });
  }

  submit(): void {
    if (this.sending() || this.loading() || this.readError() || this.unavailable() || this.saved()) return;
    if (this.form.invalid) {this.form.markAllAsTouched(); return;}
    const orderId = this.orderId;
    this.sending.set(true); this.submitError.set('');
    this.writeRequest = this.http.post('http://localhost:8080/orders/' + orderId + '/review', this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.sending.set(false);
          this.saved.set('Obrigado por avaliar sua experiência! Sua avaliação foi recebida para moderação.');
        },
        error: (error: HttpErrorResponse) => {
          this.sending.set(false);
          if (error.status === 409) {this.loadReview(); return;}
          if (error.status === 404 || error.status === 403) {this.unavailable.set(true); return;}
          this.submitError.set(error.error?.message || 'Não foi possível enviar sua avaliação. Tente novamente.');
        },
      });
  }
}
