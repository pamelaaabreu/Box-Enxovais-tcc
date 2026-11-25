import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';
import { AdminFiltersComponent } from './admin-filters.component';

describe('AdminFiltersComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [AdminFiltersComponent],
      providers: [provideNoopAnimations()],
    }),
  );
  it('updates the supplied controls and emits apply and clear without resetting the page state', async () => {
    const f = TestBed.createComponent(AdminFiltersComponent);
    const search = new FormControl('BX', { nonNullable: true });
    const status = new FormControl('active', { nonNullable: true });
    f.componentRef.setInput('fields', [
      {
        key: 'search',
        type: 'search',
        label: 'Buscar produto',
        control: search,
        placeholder: 'Nome ou SKU',
        maxlength: 200,
      },
      {
        key: 'status',
        type: 'select',
        label: 'Status',
        control: status,
        options: [
          { value: 'active', label: 'Ativos' },
          { value: 'archived', label: 'Arquivados' },
        ],
      },
    ]);
    f.detectChanges();
    const input = f.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'BX-CAM';
    input.dispatchEvent(new Event('input'));
    expect(search.value).toBe('BX-CAM');
    const select =
      await TestbedHarnessEnvironment.loader(f).getHarness(MatSelectHarness);
    expect(await (await select.host()).getAttribute('aria-label')).toBe(
      'Status',
    );
    await select.open();
    await select.clickOptions({ text: 'Arquivados' });
    expect(status.value).toBe('archived');
    const apply = spyOn(f.componentInstance.applied, 'emit'),
      clear = spyOn(f.componentInstance.cleared, 'emit');
    f.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    f.nativeElement.querySelector('button[type=button]').click();
    expect(apply).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(search.value).toBe('BX-CAM');
    expect(status.value).toBe('archived');
  });
  it('renders dynamic date fields and disabled actions without discarding their values', () => {
    const f = TestBed.createComponent(AdminFiltersComponent);
    const date = new FormControl('2026-11-22', { nonNullable: true });
    f.componentRef.setInput('fields', [
      { key: 'from', type: 'date', label: 'De', control: date, required: true },
    ]);
    f.componentRef.setInput('disabled', true);
    f.componentRef.setInput('showClear', false);
    f.detectChanges();
    expect(f.nativeElement.querySelector('input').value).toBe('2026-11-22');
    expect(f.nativeElement.querySelector('button').disabled).toBeTrue();
    expect(f.nativeElement.querySelectorAll('button').length).toBe(1);
    f.componentRef.setInput('fields', []);
    f.detectChanges();
    expect(date.value).toBe('2026-11-22');
  });
});
