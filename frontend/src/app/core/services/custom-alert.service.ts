import {
  Injectable,
  ComponentRef,
  ApplicationRef,
  createComponent,
} from '@angular/core';
import { CustomAlertComponent } from '../../shared/custom-alert/custom-alert.component';
import { AlertType, AlertOptions } from '../../shared/models';
import { Subscription } from 'rxjs';
import { FormGroup } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class CustomAlertService {
  private alerts: ComponentRef<CustomAlertComponent>[] = [];
  private subscriptions: Subscription[] = [];

  constructor(private appRef: ApplicationRef) {}

  private show(
    title: string,
    message: string = '',
    type: AlertType = 'info',
    options: AlertOptions = {}
  ) {
    const defaultOptions: AlertOptions = {
      duration: type === 'loading' ? 0 : 4000,
      showClose: true,
      showProgress: true,
    };

    const mergedOptions = { ...defaultOptions, ...options };

    const componentRef = createComponent(CustomAlertComponent, {
      environmentInjector: this.appRef.injector,
    });

    componentRef.setInput('title', title);
    componentRef.setInput('message', message);
    componentRef.setInput('type', type);
    componentRef.setInput('duration', mergedOptions.duration!);
    componentRef.setInput('showClose', mergedOptions.showClose!);
    componentRef.setInput('showProgress', mergedOptions.showProgress!);

    // Gerenciar eventos
    const closedSub = componentRef.instance.closed.subscribe(() =>
      this.removeAlert(componentRef)
    );

    this.subscriptions.push(closedSub);

    // Adicionar ao DOM dentro do container
    this.appRef.attachView(componentRef.hostView);

    // Adicionar ao container de toasts
    const toastContainer = this.getToastContainer();
    toastContainer.appendChild(componentRef.location.nativeElement);

    // Adicionar à lista
    this.alerts.push(componentRef);

    return componentRef;
  }

  private getToastContainer(): HTMLElement {
    let container = document.getElementById('alert-toast-container');

    if (!container) {
      container = document.createElement('div');
      container.id = 'alert-toast-container';
      container.className = 'alert-toast-container';
      document.body.appendChild(container);
    }

    return container;
  }

  private removeAlert(alertRef: ComponentRef<CustomAlertComponent>) {
    const index = this.alerts.indexOf(alertRef);
    if (index > -1) {
      this.alerts.splice(index, 1);
      this.appRef.detachView(alertRef.hostView);
      alertRef.destroy();
    }
  }

  // Métodos principais
  success(title: string, message?: string, options?: AlertOptions) {
    return this.show(title, message, 'success', options);
  }

  error(title: string, message?: string, options?: AlertOptions) {
    return this.show(title, message, 'error', { duration: 6000, ...options });
  }

  warning(title: string, message?: string, options?: AlertOptions) {
    return this.show(title, message, 'warning', options);
  }

  info(title: string, message?: string, options?: AlertOptions) {
    return this.show(title, message, 'info', options);
  }

  loading(title: string = 'Carregando...', options?: AlertOptions) {
    return this.show(title, '', 'loading', {
      duration: 0,
      showClose: false,
      showProgress: false,
      ...options,
    });
  }

  hideLoading() {
    this.alerts.forEach((alert) => {
      if (alert.instance.type === 'loading') {
        this.removeAlert(alert);
      }
    });
  }

  showEmailDuplicate(email: string) {
    this.show(
      'Cadastro Inválido',
      `O e-mail "${email}" já está em uso. Por favor, utilize outro e-mail.`,
      'error',
      { duration: 8000 }
    );
  }

  showCpfDuplicate(cpf: string) {
    this.show(
      'Cadastro Inválido',
      `O CPF "${cpf}" já está cadastrado. Por favor, entre em contato com o suporte.`,
      'error',
      { duration: 8000 }
    );
  }

  showFormValidationErrors(
    form: FormGroup,
    fieldNamesMap: Record<string, string>
  ): void {
    if (form.pristine) {
      this.warning('Atenção!', 'Todos os campos são obrigatórios.');
      return;
    }

    const invalidFields = Object.keys(form.controls).filter((key) => {
      const control = form.get(key);
      return control?.invalid && (control?.dirty || control?.touched);
    });

    if (invalidFields.length > 0) {
      const fieldsList = invalidFields
        .map((key) => fieldNamesMap[key] || key)
        .join(', ');

      this.warning(
        'Campos inválidos',
        `Por favor, verifique os seguintes campos: ${fieldsList}`
      );
    }
  }

  clearAll() {
    this.alerts.forEach((alert) => this.removeAlert(alert));
    this.alerts = [];
  }
}
