import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize } from 'rxjs';
import { CustomAlertService } from '../../core/services/custom-alert.service';
import { NewsletterService } from './services/newsletter.service';

@Component({
  selector: 'app-newsletter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './newsletter.component.html',
  styleUrl: './newsletter.component.scss',
})
export class NewsletterComponent {
  private readonly newsletter = inject(NewsletterService);
  private readonly alerts = inject(CustomAlertService);
  private readonly destroyRef = inject(DestroyRef);

  isLoading = false;

  onSubmit(form: NgForm): void {
    if (this.isLoading || !form.valid) {
      return;
    }

    const email = (form.value as { email?: unknown }).email;
    if (typeof email !== 'string') {
      return;
    }

    this.isLoading = true;
    this.newsletter
      .subscribe(email)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.alerts.success(
            'Solicitação recebida',
            'Se for uma nova inscrição, enviaremos a confirmação por e-mail.',
          );
          form.resetForm();
        },
        error: () => {
          this.alerts.error(
            'Não foi possível processar a solicitação',
            'Por favor, tente novamente mais tarde.',
          );
        },
      });
  }
}
