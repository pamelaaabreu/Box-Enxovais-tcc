import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { CustomAlertService } from '../../core/services/custom-alert.service';
interface Review {
  id: number;
  orderId: number;
  overall: number;
  navigation: number;
  service: number;
  experience: number;
  comment: string;
  publicationConsent: boolean;
  status: string;
  createdAt: string;
}
@Component({
  selector: 'app-experience-reviews',
  standalone: true,
  imports: [DatePipe, MatSelectModule, PaginationComponent],
  template: ` <section class="registrations">
    <header>
      <h2>Avaliações de compra</h2>
      <p>
        Modere opiniões vinculadas a compras concluídas. A publicação exige
        consentimento.
      </p>
    </header>
    @if (loading()) {
      <p role="status">Carregando avaliações…</p>
    } @else if (error()) {
      <div role="alert">
        <p>{{ error() }}</p>
        <button type="button" (click)="load()">Tentar novamente</button>
      </div>
    } @else {
      @for (
        review of reviews().slice((page() - 1) * 10, page() * 10);
        track review.id
      ) {
        <article>
          <div class="review-heading">
            <h3>Pedido #{{ review.orderId }} · {{ review.overall }}/5</h3>
            <span>{{ review.createdAt | date: 'dd/MM/yyyy' }}</span>
          </div>
          <p>
            Navegação {{ review.navigation }}/5 · Atendimento
            {{ review.service }}/5 · Experiência {{ review.experience }}/5
          </p>
          <blockquote>{{ review.comment || 'Sem comentário.' }}</blockquote>
          <p>
            {{
              review.publicationConsent
                ? 'Publicação autorizada pelo cliente'
                : 'Sem autorização de publicação'
            }}
          </p>
          <label [id]="'moderation-' + review.id">Moderação</label
          ><mat-select
            [attr.aria-labelledby]="'moderation-' + review.id"
            [value]="review.status"
            [disabled]="pending() !== 0"
            (selectionChange)="moderate(review, $event.value)"
            panelClass="box-form-options"
            ><mat-option value="pending">Pendente</mat-option
            ><mat-option value="approved">Aprovado</mat-option
            ><mat-option value="rejected">Rejeitado</mat-option></mat-select
          >
        </article>
      } @empty {
        <p>Nenhuma avaliação recebida.</p>
      }
      @if (reviews().length > 10) {
        <app-pagination
          [page]="page()"
          [total]="reviews().length"
          [pageSize]="10"
          (pageChange)="page.set($event)"
        />
      }
    }
  </section>`,
  styles: [
    `
      .registrations {
        padding: 24px;
        max-width: 1100px;
        font-family: Montserrat, sans-serif;
        color: #3d4836;
      }
      h2 {
        font-size: 26px;
        font-weight: 600;
      }
      header > p,
      p {
        font-size: 14px;
        line-height: 1.7;
      }
      article {
        margin-top: 20px;
        padding: 20px;
        border: 1px solid #dcded2;
        border-radius: 16px;
        background: #fffdf8;
        min-width: 0;
      }
      .review-heading {
        display: flex;
        gap: 16px;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
      }
      h3 {
        font-size: 17px;
        margin: 0;
      }
      blockquote {
        margin: 16px 0;
        overflow-wrap: anywhere;
        font-size: 14px;
      }
      label {
        display: block;
        font-size: 13px;
        margin: 12px 0 6px;
      }
      mat-select {
        box-sizing: border-box;
        max-width: 240px;
        padding: 12px;
        border: 1px solid #929c85;
        border-radius: 12px;
      }
      button {
        padding: 10px 18px;
        min-height: 44px;
        border-radius: 12px;
        border: 1px solid #3d4836;
        background: #3d4836;
        color: white;
      }
      button:focus-visible {
        outline: 2px solid #657550;
        outline-offset: 3px;
      }
      @media (max-width: 520px) {
        .registrations {
          padding: 16px;
        }
        article {
          padding: 16px;
        }
      }
    `,
  ],
})
export class ExperienceReviewsComponent {
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
    this.loading.set(true);
    this.error.set('');
    this.http
      .get<Review[]>('http://localhost:8080/admin/experience-reviews')
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
  moderate(review: Review, status: string) {
    this.pending.set(review.id);
    this.http
      .patch('http://localhost:8080/admin/experience-reviews/' + review.id, {
        status,
      })
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
