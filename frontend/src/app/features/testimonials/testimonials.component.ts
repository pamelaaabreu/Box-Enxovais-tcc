import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';
import { timer, switchMap, catchError, of, map } from 'rxjs';
import { HomeService } from '../../core/services/home.service';
@Component({
  selector: 'app-testimonials',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './testimonials.component.html',
  styleUrl: './testimonials.component.scss',
})
export class TestimonialsComponent {
  private readonly home = inject(HomeService);
  readonly reviews = toSignal(
    timer(0, 30000).pipe(
      switchMap(() => this.home.reviews().pipe(catchError(() => of([])))),
      map((items) =>
        items.filter((r) => r.overall >= 4 && r.comment.trim()).slice(0, 6),
      ),
    ),
    { initialValue: [] },
  );
}
