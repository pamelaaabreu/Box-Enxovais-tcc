import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogOptions } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  function setup(options: Partial<ConfirmDialogOptions> = {}) {
    const dialog = { close: jasmine.createSpy('close'), disableClose: false };
    TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialog },
        { provide: MAT_DIALOG_DATA, useValue: {
          title: 'Sair sem salvar?', message: 'Você tem alterações pendentes.',
          variant: 'warning', primary: 'Continuar editando', secondary: 'Sair sem salvar',
          confirmAction: 'secondary', ...options,
        } },
      ],
    });
    return { dialog, fixture: TestBed.createComponent(ConfirmDialogComponent) };
  }

  it('preserves the draft when the visually primary action is chosen', () => {
    const { dialog, fixture } = setup();
    fixture.componentInstance.choose('primary');
    expect(dialog.close).toHaveBeenCalledOnceWith(false);
  });

  it('confirms only the explicit discard action', () => {
    const { dialog, fixture } = setup();
    fixture.componentInstance.choose('secondary');
    expect(dialog.close).toHaveBeenCalledOnceWith(true);
  });

  it('blocks repeated clicks, stays open on error and allows retry', () => {
    const first = new Subject<void>();
    const retry = new Subject<void>();
    const execute = jasmine.createSpy('execute').and.returnValues(first, retry);
    const { dialog, fixture } = setup({ variant: 'danger', confirmAction: 'primary', execute });
    const component = fixture.componentInstance;
    component.choose('primary');
    component.choose('primary');
    component.choose('secondary');
    expect(execute).toHaveBeenCalledTimes(1);
    expect(component.processing()).toBeTrue();
    expect(dialog.disableClose).toBeTrue();

    first.error(new Error());
    expect(component.error()).toContain('Tente novamente');
    expect(dialog.close).not.toHaveBeenCalled();
    expect(dialog.disableClose).toBeFalse();

    component.choose('primary');
    retry.next();
    expect(dialog.close).toHaveBeenCalledOnceWith(true);
  });
});
