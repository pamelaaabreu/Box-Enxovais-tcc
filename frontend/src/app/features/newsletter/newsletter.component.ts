import { Component } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SweetAlertService } from '../../core/services/sweet-alert.service';

@Component({
  selector: 'app-newsletter',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './newsletter.component.html',
  styleUrl: './newsletter.component.css',
})
export class NewsletterComponent {
  successMessage: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  private backendUrl = 'http://localhost:8080/api/newsletter/subscribe';

  constructor(private http: HttpClient,
     private sweetAlertService: SweetAlertService
  ) {}

  onSubmit(form: NgForm) {
    if (!form.valid) {
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
           this.sweetAlertService.showSuccess(
          'Inscrição confirmada!', 
          'Obrigado! Confira seu e-mail para receber o cupom de desconto.' 
        );
          this.isLoading = false;
          form.reset();
        },
        // Callback para erro
        error: (error) => {
          this.sweetAlertService.showError(
          'Ops, algo deu errado...', 
          'Não foi possível realizar sua inscrição. Por favor, tente novamente mais tarde.' 
        );
          this.isLoading = false;
          console.error('Erro na inscrição:', error);
        },
      });
  }
}
