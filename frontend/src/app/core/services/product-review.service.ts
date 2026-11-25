import { DestroyRef, Injectable, inject, signal } from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, tap } from 'rxjs';

import {
  ProductReview,
  ProductReviewInput,
  ReviewableProduct,
  ReviewSummary,
  ReviewSummaryState,
} from '../../shared/types/product-review.types';

@Injectable({ providedIn: 'root' })
export class ProductReviewService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly base = 'http://localhost:8080';

  readonly changed = new Subject<void>();

  // Armazena as médias de avaliações por produto.
  readonly summaries = signal<Record<number, ReviewSummaryState>>({});

  private readonly queued = new Set<number>();

  private scheduled = false;
  private generation = 0;
  private destroyed = false;

  constructor() {
    this.destroyRef.onDestroy(() => (this.destroyed = true));
  }

  mine() {
    return this.http.get<ProductReview[]>(this.base + '/me/product-reviews');
  }

  reviewable() {
    return this.http.get<ReviewableProduct[]>(
      this.base + '/me/review-products',
    );
  }

  publicReviews(id: number) {
    return this.http.get<ProductReview[]>(
      this.base + '/products/' + id + '/reviews',
    );
  }

  home() {
    return this.http.get<ProductReview[]>(this.base + '/home/product-reviews');
  }

  admin() {
    return this.http.get<ProductReview[]>(this.base + '/admin/product-reviews');
  }

  create(id: number, input: ProductReviewInput) {
    return this.http
      .post(this.base + '/products/' + id + '/reviews', input)
      .pipe(tap(() => this.invalidate()));
  }

  update(id: number, input: ProductReviewInput) {
    return this.http
      .patch(this.base + '/me/product-reviews/' + id, input)
      .pipe(tap(() => this.invalidate()));
  }

  // Envia o estado esperado para controle de concorrência.
  moderate(review: ProductReview, status: string) {
    return this.http
      .patch(this.base + '/admin/product-reviews/' + review.id, {
        status,
        expectedUpdatedAt: review.updatedAt,
      })
      .pipe(tap(() => this.invalidate()));
  }

  image(path: string) {
    return path
      ? /^https?:\/\//.test(path)
        ? path
        : this.base + '/' + path.replace(/^\//, '')
      : '';
  }

  ensureSummary(id: number, force = false): void {
    if (!Number.isSafeInteger(id) || id <= 0) return;

    const current = this.summaries()[id];

    // Reutiliza dados já carregados durante 60 segundos.
    if (
      !force &&
      current &&
      (current.loading || Date.now() - current.loadedAt < 60000)
    )
      return;

    this.summaries.update((items) => ({
      ...items,
      [id]: {
        average: current?.average ?? 0,
        count: current?.count ?? 0,
        loading: true,
        error: false,
        loadedAt: 0,
      },
    }));

    // Adiciona o produto à fila de consultas.
    this.queued.add(id);

    if (this.scheduled) return;

    this.scheduled = true;

    // Agrupa solicitações realizadas no mesmo ciclo.
    queueMicrotask(() => {
      this.scheduled = false;

      if (!this.destroyed) this.flush();
    });
  }

  private flush(): void {
    const ids = [...this.queued];

    this.queued.clear();

    // Divide as consultas em lotes de até 100 produtos.
    for (let offset = 0; offset < ids.length; offset += 100) {
      const batch = ids.slice(offset, offset + 100);
      const generation = this.generation;

      this.http
        .get<Record<number, ReviewSummary>>(
          this.base + '/products/review-summaries',
          {
            params: { ids: batch.join(',') },
          },
        )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => {
            // Ignora respostas de gerações anteriores.
            if (generation !== this.generation) return;

            this.summaries.update((items) => {
              const result = { ...items };

              for (const id of batch) {
                result[id] = {
                  ...(response[id] ?? { average: 0, count: 0 }),
                  loading: false,
                  error: false,
                  loadedAt: Date.now(),
                };
              }

              return result;
            });
          },

          error: () => {
            if (generation !== this.generation) return;

            this.summaries.update((items) => {
              const result = { ...items };

              for (const id of batch) {
                result[id] = {
                  ...result[id],
                  loading: false,
                  error: true,
                  loadedAt: Date.now(),
                };
              }

              return result;
            });
          },
        });
    }
  }

  // Invalida o cache após mudanças nas avaliações.
  private invalidate(): void {
    this.generation++;

    for (const id of Object.keys(this.summaries()).map(Number)) {
      this.ensureSummary(id, true);
    }

    this.changed.next();
  }
}
