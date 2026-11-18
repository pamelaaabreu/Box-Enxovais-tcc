import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CustomAlertService } from '../../core/services/custom-alert.service';

@Component({
  selector: 'app-newsletter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './newsletter.component.html',
  styleUrl: './newsletter.component.css',
})
export class NewsletterComponent {
  successMessage: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  private backendUrl = 'http://localhost:8080/api/newsletter/subscribe';

  constructor(private http: HttpClient,
     private alerts: CustomAlertService
  ) {}

  onSubmit(form: NgForm) {
    if (this.isLoading || !form.valid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const email = form.value.email;

    this.http
      .post<{ message: string }>(this.backendUrl, { email: email })
      .subscribe({
        // Callback para sucesso
        next: (response) => {
           this.alerts.success(
          'Inscrição confirmada!', 
          'Obrigado por acompanhar as novidades e campanhas da loja.'
        );
          this.isLoading = false;
          form.reset();
        },
        // Callback para erro
        error: (error) => {
          this.alerts.error(
          'Ops, algo deu errado...', 
          'Não foi possível realizar sua inscrição. Por favor, tente novamente mais tarde.' 
        );
          this.isLoading = false;

        },
      });
  }
}
