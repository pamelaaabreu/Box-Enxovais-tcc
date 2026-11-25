import { Injectable, inject } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import type {
  ConfirmDialogOptions,
  ConfirmDialogLayout,
} from '../../types/ui/confirm-dialog';

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly dialog = inject(MatDialog);
  private nextId = 0;
  private readonly config: MatDialogConfig = {
    role: 'alertdialog',
    width: '480px',
    maxWidth: 'calc(100vw - 32px)',
    autoFocus: '.box-confirm-secondary',
    restoreFocus: true,
    panelClass: 'box-confirm-panel',
    backdropClass: 'box-confirm-backdrop',
  };

  open(options: ConfirmDialogOptions, layout?: ConfirmDialogLayout) {
    const id = `box-confirm-${++this.nextId}`;
    return this.dialog.open<
      ConfirmDialogComponent,
      ConfirmDialogOptions,
      boolean
    >(ConfirmDialogComponent, {
      ...this.config,
      ...(layout && {
        width: layout.width,
        panelClass: ['box-confirm-panel', layout.panelClass],
      }),
      id,
      ariaLabelledBy: id + '-title',
      ariaDescribedBy: id + '-description',
      data: options,
      disableClose: options.disableClose,
      autoFocus:
        options.confirmAction === 'secondary'
          ? '.box-confirm-primary'
          : this.config.autoFocus,
    });
  }
}
