import {
  Injectable,
  ComponentRef,
  ApplicationRef,
  createComponent,
} from '@angular/core';
import { CustomAlertComponent } from '../../shared/custom-alert/custom-alert.component';
import { AlertType, AlertOptions } from '../../shared/models';
import { FormGroup } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class CustomAlertService {
  // Armazena as referências dos alertas criados.
  private alerts: ComponentRef<CustomAlertComponent>[] = [];

  constructor(private appRef: ApplicationRef) {}

  private show(
    title: string,
    message: string = '',
    type: AlertType = 'info',
    options: AlertOptions = {},
  ) {
    // Define as configurações padrão.
    const defaultOptions: AlertOptions = {
      duration: type === 'loading' ? 0 : 4000,
      showClose: true,
      showProgress: true,
    };

    // As opções recebidas sobrescrevem as configurações padrão.
    const mergedOptions = { ...defaultOptions, ...options };

    // Evita exibir alertas idênticos simultaneamente.
    const existing = this.alerts.find(
      ({ instance }) =>
        instance.visible &&
        instance.title === title &&
        instance.message === message &&
        instance.type === type &&
        instance.action?.label === options.action?.label,
    );

    if (existing) return existing;

    // Cria dinamicamente o componente.
    const componentRef = createComponent(CustomAlertComponent, {
      environmentInjector: this.appRef.injector,
    });

    // Define os Inputs do componente.
    componentRef.setInput('action', mergedOptions.action);
    componentRef.setInput('title', title);
    componentRef.setInput('message', message);
    componentRef.setInput('type', type);
    componentRef.setInput('duration', mergedOptions.duration!);
    componentRef.setInput('showClose', mergedOptions.showClose!);
    componentRef.setInput('showProgress', mergedOptions.showProgress!);

    // Escuta o evento de fechamento.
    const closedSub = componentRef.instance.closed.subscribe(() =>
      this.removeAlert(componentRef),
    );

    // Encerra a inscrição quando o componente for destruído.
    componentRef.onDestroy(() => closedSub.unsubscribe());

    // Integra o componente ao mecanismo de detecção de mudanças.
    this.appRef.attachView(componentRef.hostView);

    // Insere o componente no container de alertas.
    const toastContainer = this.getToastContainer();

    toastContainer.appendChild(componentRef.location.nativeElement);

    // Registra o alerta criado.
    this.alerts.push(componentRef);

    componentRef.changeDetectorRef.detectChanges();

    return componentRef;
  }

  private getToastContainer(): HTMLElement {
    // Procura um container existente.
    let container = document.getElementById('alert-toast-container');

    // Cria o container caso ainda não exista.
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
      // Remove a referência do array.
      this.alerts.splice(index, 1);

      // Desvincula a view da aplicação.
      this.appRef.detachView(alertRef.hostView);

      // Destrói o componente.
      alertRef.destroy();
    }
  }

  success(title: string, message?: string, options?: AlertOptions) {
    return this.show(title, message, 'success', options);
  }

  error(title: string, message?: string, options?: AlertOptions) {
    return this.show(title, message, 'error', {
      duration: 0,
      ...options,
    });
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

  // Remove todos os alertas de carregamento.
  hideLoading() {
    [...this.alerts].forEach((alert) => {
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
      { duration: 8000 },
    );
  }

  showCpfDuplicate(cpf: string) {
    this.show(
      'Cadastro Inválido',
      `O CPF "${cpf}" já está cadastrado. Por favor, entre em contato com o suporte.`,
      'error',
      { duration: 8000 },
    );
  }

  showFormValidationErrors(
    form: FormGroup,
    fieldNamesMap: Record<string, string>,
  ): void {
    // Verifica se o formulário ainda está pristine.
    if (form.pristine) {
      this.warning('Atenção!', 'Todos os campos são obrigatórios.');
      return;
    }

    // Seleciona os campos inválidos que foram alterados ou tocados.
    const invalidFields = Object.keys(form.controls).filter((key) => {
      const control = form.get(key);

      return control?.invalid && (control?.dirty || control?.touched);
    });

    if (invalidFields.length > 0) {
      // Converte os nomes técnicos em nomes amigáveis.
      const fieldsList = invalidFields
        .map((key) => fieldNamesMap[key] || key)
        .join(', ');

      this.warning(
        'Campos inválidos',
        `Por favor, verifique os seguintes campos: ${fieldsList}`,
      );
    }
  }

  // Destrói todos os alertas existentes.
  clearAll() {
    [...this.alerts].forEach((alert) => this.removeAlert(alert));

    this.alerts = [];
  }
}
