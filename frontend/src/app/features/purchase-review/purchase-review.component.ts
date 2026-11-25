import { ExperienceReview } from '../../shared/types/experience-review.types';
import { PurchaseReviewService } from '../../core/services/purchase-review.service';
import { AdminStateComponent } from '../../shared/components/admin-state/admin-state.component';
import { InlineNoticeComponent } from '../../shared/components/inline-notice/inline-notice.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import {
  Component,
  DestroyRef,
  Input,
  OnChanges,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-purchase-review',
  standalone: true,
  imports: [
    AdminStateComponent,
    InlineNoticeComponent,
    ReactiveFormsModule,
    MatIconModule,
  ],
  templateUrl: './purchase-review.component.html',
  styleUrl: './purchase-review.component.scss',
})
export class PurchaseReviewComponent implements OnChanges {
  @Input({ required: true }) orderId!: number;
  private readonly reviewApi = inject(PurchaseReviewService);
  private readonly destroyRef = inject(DestroyRef);
  private readRequest?: Subscription;
  private writeRequest?: Subscription;
  private loadedOrderId = 0;
  @Input() compact = false;
  readonly review = signal<ExperienceReview | null>(null);
  readonly editing = signal(false);
  readonly dismissed = signal(false);
  readonly topics = [
    { id: 'navigation', label: 'Navegação no site' },
    { id: 'product_information', label: 'Informações do produto' },
    { id: 'checkout', label: 'Finalização da compra' },
    { id: 'payment', label: 'Formas de pagamento' },
    { id: 'shipping', label: 'Clareza do frete e prazo' },
  ];
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
    experience: [null as number | null, [Validators.min(1), Validators.max(5)]],
    topics: [[] as string[]],
    comment: ['', Validators.maxLength(1000)],
    publicationConsent: false,
  });

  ngOnChanges(): void {
    if (this.loadedOrderId !== this.orderId) {
      this.writeRequest?.unsubscribe();
      this.sending.set(false);
      this.form.reset();
      this.hoveredRating.set(0);
      this.submitError.set('');
      this.loadedOrderId = this.orderId;
    }
    this.loadReview();
  }

  loadReview(): void {
    this.readRequest?.unsubscribe();
    this.readError.set(false);
    this.unavailable.set(false);
    this.loading.set(true);
    this.saved.set('');
    if (!Number.isSafeInteger(this.orderId) || this.orderId < 1) {
      this.loading.set(false);
      this.unavailable.set(true);
      return;
    }
    this.readRequest = this.reviewApi
      .read(this.orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (review) => {
          this.loading.set(false);
          this.review.set(review);
          this.editing.set(false);
          if (review) {
            this.form.patchValue({
              overall: review.overall,
              experience: review.experience,
              topics: review.topics ?? [],
              comment: review.comment,
              publicationConsent: review.publicationConsent,
            });
            this.saved.set(
              'Você já avaliou este pedido. Obrigado por compartilhar sua experiência.',
            );
          }
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          if (error.status === 404 || error.status === 403)
            this.unavailable.set(true);
          else this.readError.set(true);
        },
      });
  }

  toggleTopic(id: string): void {
    const control = this.form.controls.topics;
    control.setValue(
      control.value.includes(id)
        ? control.value.filter((x) => x !== id)
        : [...control.value, id],
    );
  }
  topicLabel(id: string): string {
    return this.topics.find((x) => x.id === id)?.label ?? id;
  }
  startEdit(): void {
    this.editing.set(true);
    this.saved.set('');
  }
  submit(): void {
    if (
      this.sending() ||
      this.loading() ||
      this.readError() ||
      this.unavailable() ||
      (this.saved() && !this.editing())
    )
      return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const orderId = this.orderId;
    this.sending.set(true);
    this.submitError.set('');
    this.writeRequest = this.reviewApi
      .save(orderId, this.form.getRawValue(), !!this.review())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.loadReview();
        },
        error: (error: HttpErrorResponse) => {
          this.sending.set(false);
          if (error.status === 409) {
            this.loadReview();
            return;
          }
          if (error.status === 404 || error.status === 403) {
            this.unavailable.set(true);
            return;
          }
          this.submitError.set(
            error.error?.message ||
              'Não foi possível enviar sua avaliação. Tente novamente.',
          );
        },
      });
  }
}
