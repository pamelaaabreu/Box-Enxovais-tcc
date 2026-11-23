import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';
import { PeriodFilterComponent } from './period-filter.component';

describe('PeriodFilterComponent', () => {
  it('updates the existing controls through Material dropdowns and keeps custom dates', async () => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fixture = TestBed.createComponent(PeriodFilterComponent);
    const form = new FormGroup({
      period: new FormControl('30d', { nonNullable: true }),
      dateFrom: new FormControl('', { nonNullable: true }),
      dateTo: new FormControl('', { nonNullable: true }),
      group: new FormControl('auto', { nonNullable: true }),
    });
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const period = await loader.getHarness(MatSelectHarness.with({ selector: '[formControlName="period"]' }));
    await period.open();
    await period.clickOptions({ text: 'Período personalizado' });
    expect(form.controls.period.value).toBe('custom');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('input[type="date"]').length).toBe(2);
    const group = await loader.getHarness(MatSelectHarness.with({ selector: '[formControlName="group"]' }));
    await group.open();
    await group.clickOptions({ text: 'Por mês' });
    expect(form.controls.group.value).toBe('month');
    const applied = spyOn(fixture.componentInstance.applied, 'emit');
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    expect(applied).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
  });
});
