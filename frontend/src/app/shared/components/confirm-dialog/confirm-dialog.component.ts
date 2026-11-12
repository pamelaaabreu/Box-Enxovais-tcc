import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, TemplateRef, ViewEncapsulation, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, defer, finalize, first } from 'rxjs';

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

@Component({
  standalone: true,
  imports: [NgTemplateOutlet, MatDialogModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ConfirmDialogComponent {
  readonly data: ConfirmDialogOptions = inject(MAT_DIALOG_DATA);
  private readonly dialog = inject<MatDialogRef<ConfirmDialogComponent, boolean>>(MatDialogRef);
  private readonly destroyRef = inject(DestroyRef);
  readonly processing = signal(false);
  readonly error = signal('');
  readonly titleId = this.dialog.id + '-title';
  readonly descriptionId = this.dialog.id + '-description';
  private closing = false;
  readonly icon = this.data.icon ?? {
    warning: 'warning_amber',
    danger: 'delete_outline',
    info: 'info_outline',
  }[this.data.variant];

  choose(action: 'primary' | 'secondary'): void {
    if (this.processing() || this.closing) return;
    if (action !== (this.data.confirmAction ?? 'primary')) {
      this.close(false);
      return;
    }
    if (!this.data.execute) {
      this.close(true);
      return;
    }

    const disableClose = this.dialog.disableClose;
    this.dialog.disableClose = true;
    this.error.set('');
    this.processing.set(true);
    defer(this.data.execute).pipe(
      first(),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.processing.set(false);
        this.dialog.disableClose = disableClose;
      }),
    ).subscribe({
      next: () => this.close(true),
      error: error => this.error.set(this.data.errorMessage?.(error) ?? 'Não foi possível concluir a operação. Tente novamente.'),
    });
  }
  private close(confirmed: boolean): void {
    this.closing = true;
    this.dialog.close(confirmed);
  }
}
