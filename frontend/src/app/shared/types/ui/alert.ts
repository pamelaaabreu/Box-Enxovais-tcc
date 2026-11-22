export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface AlertOptions {
  action?: { label: string; run: () => void };
  duration?: number;
  showClose?: boolean;
  showProgress?: boolean;
}
