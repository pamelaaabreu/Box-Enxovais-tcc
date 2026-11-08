import { Injectable } from '@angular/core';
import Swal, { SweetAlertOptions, SweetAlertResult } from 'sweetalert2';
import { FormGroup } from '@angular/forms';

@Injectable({
  providedIn: 'root',
})
export class SweetAlertService {
  constructor() {}

  private baseOptions: SweetAlertOptions = {
    confirmButtonColor: '#92402d',
    background: '#f5f5f5',
    confirmButtonText: 'OK!',
    scrollbarPadding: false,
  };

  showSuccess(title: string, text?: string): Promise<SweetAlertResult> {
    return Swal.fire({
      ...this.baseOptions,
      icon: 'success',
      title,
      text,
    });
  }

  showError(title: string, text: string): void {
    Swal.fire({
      ...this.baseOptions,
      icon: 'error',
      title,
      text,
    });
  }

  showWarning(title: string, text: string): void {
    Swal.fire({
      ...this.baseOptions,
      icon: 'warning',
      title,
      text,
    });
  }

  showLoading(title: string = 'Carregando...'): void {
    Swal.fire({
      title,
      allowOutsideClick: false,
      background: '#f5f5f5',
      didOpen: () => {
        Swal.showLoading();
      },
    });
  }

  hideLoading(): void {
    Swal.close();
  }

  showEmailDuplicate(email: string): void {
    Swal.fire({
      ...this.baseOptions,
      title: 'E-mail já cadastrado',
      icon: 'error',
      html: `
        <p>O e-mail <strong>${email}</strong> já está cadastrado.</p>
        <p style="font-size: 0.9rem;">Por favor, utilize outro e-mail ou <a href="/login" style="color: #92402d; font-weight: 600;">faça login</a>.</p>
      `,
    });
  }

  showCpfDuplicate(cpf: string): void {
    Swal.fire({
      ...this.baseOptions,
      title: 'CPF já cadastrado',
      icon: 'error',
      html: `
        <p>O CPF <strong>${cpf}</strong> já está cadastrado.</p>
        <p style="font-size: 0.9rem;">Verifique os dados ou entre em contato com o suporte.</p>
      `,
    });
  }

  showFormValidationErrors(
    form: FormGroup,
    fieldNamesMap: Record<string, string>
  ): void {
    if (form.pristine) {
      // Usa o método de aviso que já criamos para consistência
      this.showWarning('Atenção!', 'Todos os campos são obrigatórios.');
      return;
    }

    const invalidFields = Object.keys(form.controls).filter((key) => {
      const control = form.get(key);
      return control?.invalid;
    });

    if (invalidFields.length > 0) {
      // Traduz os nomes dos controles para nomes amigáveis
      const fieldsList = invalidFields
        .map((key) => fieldNamesMap[key] || key) // Usa o nome do mapa ou o nome da chave como fallback
        .join(', ');

      Swal.fire({
        ...this.baseOptions, // Reutiliza a configuração base
        title: 'Campos pendentes ou inválidos',
        icon: 'warning',
        html: `Por favor, verifique os seguintes campos: <strong>${fieldsList}</strong>`,
      });
    }
  }
}
