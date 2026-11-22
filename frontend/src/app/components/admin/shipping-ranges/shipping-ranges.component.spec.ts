import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { reflectComponentType } from '@angular/core';
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
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
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
});
