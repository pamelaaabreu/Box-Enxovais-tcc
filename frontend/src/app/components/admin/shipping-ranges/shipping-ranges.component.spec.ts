import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { reflectComponentType } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CustomAlertService } from '../../../core/services/custom-alert.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { ShippingRangesComponent } from './shipping-ranges.component';

registerLocaleData(localePt, 'pt-BR');

describe('ShippingRangesComponent', () => {
  const url = 'http://localhost:8080/admin/catalog/shipping-ranges';
  beforeEach(() => TestBed.configureTestingModule({
    imports: [ShippingRangesComponent],
    providers: [provideNoopAnimations(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: CustomAlertService, useValue: { success: jasmine.createSpy('success') } },
      { provide: ConfirmDialogService, useValue: { open: jasmine.createSpy('open') } },
    ],
  }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('loads the standalone component and its external template from the new folder', () => {
    const fixture = TestBed.createComponent(ShippingRangesComponent);
    const request = TestBed.inject(HttpTestingController).expectOne(url);
    expect(request.request.method).toBe('GET');
    request.flush([]);
    fixture.detectChanges();
    expect(reflectComponentType(ShippingRangesComponent)?.isStandalone).toBeTrue();
    expect(fixture.nativeElement.querySelector('app-admin-page-header h1').textContent).toContain('Faixas de CEP');
    expect(fixture.componentInstance.loading()).toBeFalse();
  });

  it('preserves CEP filtering and editor values without sending a write request', () => {
    const fixture = TestBed.createComponent(ShippingRangesComponent);
    const item = { id: 1, name: 'Região de teste', startCep: '87500000', endCep: '87599999', priceCents: 1290, minDays: 1, maxDays: 2, active: true };
    TestBed.inject(HttpTestingController).expectOne(url).flush([item]);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.query.set('87500-000');
    expect(component.filtered()).toEqual([item]);
    component.start(item);
    expect(component.form.controls.price.value).toBe(12.9);
    expect(component.form.controls.startCep.value).toBe('87500000');
    expect(component.editing()).toBeTrue();
    component.query.set('sem resultado');
    expect(component.filtered()).toEqual([]);
  });
  it('preserves cents in the write contract and retains values after an overlap', () => {
    const fixture = TestBed.createComponent(ShippingRangesComponent);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(url).flush([]); fixture.detectChanges();
    const c = fixture.componentInstance; c.start();
    c.form.patchValue({ name: 'Teste', startCep: '87500000', endCep: '87509999', price: 12.9, minDays: 1, maxDays: 2 }); c.save();
    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Teste', startCep: '87500000', endCep: '87509999', priceCents: 1290, minDays: 1, maxDays: 2, active: true });
    req.flush({ message: 'Faixa de CEP sobreposta.' }, { status: 409, statusText: 'Conflict' });
    expect(c.editing()).toBeTrue(); expect(c.coverageError()).toContain('sobreposta'); expect(c.form.controls.name.value).toBe('Teste');
    c.save(); http.expectOne(url).flush({}); http.expectOne(url).flush([]);
  });
  it('rejects inverted limits and fractional days without HTTP writes', () => {
    const fixture = TestBed.createComponent(ShippingRangesComponent);
    const http = TestBed.inject(HttpTestingController); http.expectOne(url).flush([]); fixture.detectChanges();
    const c = fixture.componentInstance; c.start();
    c.form.patchValue({ name: 'Teste', startCep: '87599999', endCep: '87500000', minDays: 3, maxDays: 2 }); c.save();
    expect(c.cepOrderError()).toBeTruthy(); expect(c.daysOrderError()).toBeTruthy();
    c.form.patchValue({ startCep: '87500000', endCep: '87599999', minDays: 1.5, maxDays: 2 }); c.save();
    expect(c.fieldError('minDays')).toBe('Informe dias inteiros.'); http.expectNone(req => req.method !== 'GET');
  });
  it('keeps the original status after a failed toggle', () => {
    const fixture = TestBed.createComponent(ShippingRangesComponent); const http = TestBed.inject(HttpTestingController);
    const item = { id: 9, name: 'Teste', startCep: '87500000', endCep: '87509999', priceCents: 1290, minDays: 1, maxDays: 2, active: true };
    http.expectOne(url).flush([item]); fixture.detectChanges(); fixture.componentInstance.toggle(item);
    const req = http.expectOne(url + '/9'); expect(req.request.body.active).toBeFalse(); req.flush({}, { status: 500, statusText: 'Server error' });
    expect(fixture.componentInstance.items()[0].active).toBeTrue(); expect(fixture.componentInstance.saving()).toBeFalse();
  });
  it('uses the shared discard confirmation and preserves the dirty form on cancel', () => {
    const fixture = TestBed.createComponent(ShippingRangesComponent); TestBed.inject(HttpTestingController).expectOne(url).flush([]); fixture.detectChanges();
    const c = fixture.componentInstance; const open = TestBed.inject(ConfirmDialogService).open as jasmine.Spy;
    open.and.returnValue({ afterClosed: () => of(false) }); c.start(); c.form.controls.name.setValue('Não perder'); c.form.markAsDirty(); c.requestClose();
    expect(open).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Descartar alterações?', confirmAction: 'secondary' })); expect(c.editing()).toBeTrue(); expect(c.form.controls.name.value).toBe('Não perder');
    open.and.returnValue({ afterClosed: () => of(true) }); c.requestClose();
  });
  it('reuses the monetary mask with a numeric form value', () => {
    const fixture = TestBed.createComponent(ShippingRangesComponent); TestBed.inject(HttpTestingController).expectOne(url).flush([]);
    const input = document.createElement('input'); input.value = '1290abc'; fixture.componentInstance.maskFreight({ target: input } as unknown as Event);
    expect(input.value).toBe('12,90'); expect(fixture.componentInstance.form.controls.price.value).toBe(12.9); expect(fixture.componentInstance.form.dirty).toBeTrue();
  });

});
