import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { InlineNoticeComponent } from '../../../shared/components/inline-notice/inline-notice.component';
import { ProductReviewService } from '../../../core/services/product-review.service';
import {
  ProductReview,
  ReviewableProduct,
} from '../../../shared/types/product-review.types';
@Component({
  selector: 'app-product-review-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, InlineNoticeComponent],
  templateUrl: './product-review-form.component.html',
  styleUrl: './product-review-form.component.scss',
})
export class ProductReviewFormComponent implements OnChanges {
  @Input({ required: true }) product!: ReviewableProduct;
  @Input() review: ProductReview | null = null;
  @Output() readonly saved = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<void>();
  readonly service = inject(ProductReviewService);
  private readonly destroyRef = inject(DestroyRef);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly ratings = [1, 2, 3, 4, 5];
  readonly form = inject(FormBuilder).nonNullable.group({
    rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
    comment: ['', Validators.maxLength(1000)],
    publicationConsent: false,
  });
  ngOnChanges() {
    this.error.set('');
    this.form.reset({
      rating: this.review?.rating ?? 0,
      comment: this.review?.comment ?? '',
      publicationConsent: this.review?.publicationConsent ?? false,
    });
  }
  submit() {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const input = this.form.getRawValue();
    const request = this.review
      ? this.service.update(this.review.id, input)
      : this.service.create(this.product.productId, input);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
      },
      error: (error) => {
        this.saving.set(false);
        this.error.set(
          error.error?.message ||
            'Não foi possível salvar a avaliação. Tente novamente.',
        );
      },
    });
  }
}
