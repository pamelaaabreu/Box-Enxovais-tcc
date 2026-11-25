import type { TemplateRef } from '@angular/core';
import type { Observable } from 'rxjs';
export interface ConfirmDialogOptions {
  title: string;
  message: string;
  variant: 'warning' | 'danger' | 'info';
  icon?: string;
  primary: string;
  secondary: string;
  confirmAction?: 'primary' | 'secondary';
  disableClose?: boolean;
  details?: readonly string[];
  content?: TemplateRef<unknown>;
  actions?: TemplateRef<unknown>;
  execute?: () => Observable<unknown>;
  errorMessage?: (error: unknown) => string;
}

export interface ConfirmDialogLayout {
  width: string;
  panelClass: string;
}
