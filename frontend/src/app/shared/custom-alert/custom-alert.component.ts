import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ViewEncapsulation,
} from '@angular/core';
import { AlertType } from '../../shared/models';

@Component({
  selector: 'app-custom-alert',
  standalone: true,
  templateUrl: './custom-alert.component.html',
  styleUrls: ['./custom-alert.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class CustomAlertComponent implements OnInit, OnDestroy {
  @Input() title: string = '';
  @Input() message: string = '';
  @Input() type: AlertType = 'info';
  @Input() duration: number = 2000;
  @Input() showClose: boolean = true;
  @Input() showProgress: boolean = true;

  // Ação opcional que pode ser executada pelo usuário.
  @Input() action?: { label: string; run: () => void };

  // Associa cada tipo de alerta a um ícone.
  readonly icons: Record<AlertType, string> = {
    success: 'check',
    error: 'error_outline',
    warning: 'warning_amber',
    info: 'info_outline',
    loading: 'autorenew',
  };

  activate(): void {
    if (this.closing) return;

    // Executa a ação e fecha o alerta.
    this.action?.run();

    this.close();
  }

  @Input() recoverySuccess = false;

  // Notifica quando o tempo de exibição termina.
  @Output() elapsed = new EventEmitter<void>();

  // Notifica quando o alerta termina seu fechamento.
  @Output() closed = new EventEmitter<void>();

  visible: boolean = false;

  private timeoutId?: ReturnType<typeof setTimeout>;
  private exitTimeoutId?: ReturnType<typeof setTimeout>;
  private closing = false;

  ngOnInit() {
    this.visible = true;

    // Programa o fechamento automático.
    if (this.duration > 0) {
      this.timeoutId = setTimeout(() => {
        this.elapsed.emit();

        this.close();
      }, this.duration);
    }
  }

  // Limpa os timers quando o componente é destruído.
  ngOnDestroy() {
    clearTimeout(this.exitTimeoutId);

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  onClose() {
    this.close();
  }

  private close() {
    // Impede fechamentos duplicados.
    if (this.closing) return;

    this.closing = true;

    clearTimeout(this.timeoutId);

    this.visible = false;

    // Aguarda 90 ms antes de emitir o fechamento.
    this.exitTimeoutId = setTimeout(() => {
      this.closed.emit();
    }, 90);
  }
}
