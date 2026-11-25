import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, startWith, switchMap } from 'rxjs';
import { ProductReviewService } from '../../core/services/product-review.service';
@Component({
  selector: 'app-testimonials',
  standalone: true,
  imports: [MatIconModule, RouterLink],
  templateUrl: './testimonials.component.html',
  styleUrl: './testimonials.component.scss',
})
export class TestimonialsComponent {
  readonly service = inject(ProductReviewService);
  readonly reviews = toSignal(
    this.service.changed.pipe(
      startWith(undefined),
      switchMap(() => this.service.home().pipe(catchError(() => of([])))),
    ),
    { initialValue: [] },
  );
  productSlug(name: string, id: number) {
    return (
      name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      id
    );
  }
}
