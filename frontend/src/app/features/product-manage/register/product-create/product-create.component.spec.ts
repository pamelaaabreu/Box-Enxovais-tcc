import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, Observable } from 'rxjs';
import { ProductCreateComponent } from './product-create.component';
import { CustomAlertService } from '../../../../core/services/custom-alert.service';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';

describe('ProductCreateComponent', () => {
  const url = 'http://localhost:8080/products';
  let alerts: { success: jasmine.Spy; error: jasmine.Spy };
  let confirm: jasmine.Spy;
  beforeEach(() => {
    alerts = { success: jasmine.createSpy(), error: jasmine.createSpy() };
    confirm = jasmine.createSpy().and.returnValue({ afterClosed: () => of(false) });
    TestBed.configureTestingModule({
      imports: [ProductCreateComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: CustomAlertService, useValue: alerts },
        { provide: ConfirmDialogService, useValue: { open: confirm } }],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function setup() {
    const fixture = TestBed.createComponent(ProductCreateComponent);
    const http = TestBed.inject(HttpTestingController);
    const page = fixture.componentInstance;
    http.expectOne(url + '/categories').flush([{ id: 9, name: 'Toalhas' }]);
    http.expectOne('http://localhost:8080/admin/products/brands').flush([{ id: 8, name: 'Marca teste' }]);
    fixture.detectChanges();
    return { fixture, page, http };
  }

  it('explains automatic SKU and has no editable SKU field', () => {
    const { fixture, page } = setup();
    expect(page.form.get('sku')).toBeNull();
    expect(fixture.nativeElement.querySelector('#product-sku')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('O SKU será gerado automaticamente após salvar o produto.');
  });

  it('masks typed digits as cents and strips letters and pasted formatting', () => {
    const {fixture,page}=setup();
    const input: HTMLInputElement=fixture.nativeElement.querySelector('#product-price');
    const type=(value:string)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));fixture.detectChanges();};
    for(const [raw,formatted] of [['1','0,01'],['0,012','0,12'],['0,123','1,23'],['1,234','12,34'],['R$ 1.234,56','1.234,56'],['12a3','1,23'],['abc',''],['99999999999','99.999.999,99']]) {
      type(raw);expect(input.value).withContext(raw).toBe(formatted);expect(page.fields.price.value).toBe(formatted);
    }
    type('');expect(page.fields.price.invalid).toBeTrue();
    type('0');expect(input.value).toBe('0,00');expect(page.fields.price.invalid).toBeTrue();
  });

  it('starts pending, rejects invalid fields and renders the checklist and name counter', () => {
    const { fixture, page, http } = setup();
    expect(page.progress).toBe(20);
    page.form.patchValue({ name: ' ', price: '-2', quantity: 1.5, status: 'draft' });
    page.onSubmit();
    expect(page.form.invalid).toBeTrue();
    http.expectNone(url);
    page.fields.name.setValue('Toalha');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('6/100');
    expect(fixture.nativeElement.querySelector('.store-preview').textContent).toContain('Toalha');
    expect(fixture.nativeElement.querySelector('#quantity-error')).not.toBeNull();
  });

  for (const price of ['0', '-1', 'abc', '2,333', '100.000.000,00', '1.2']) {
    it('rejects invalid price ' + price, () => {
      const { page } = setup();
      page.fields.price.setValue(price);
      expect(page.fields.price.invalid).toBeTrue();
    });
  }

  for (const quantity of [-1, 1.5, 2147483648, null]) {
    it('rejects invalid quantity ' + quantity, () => {
      const { page } = setup();
      page.fields.quantity.setValue(quantity);
      expect(page.fields.quantity.invalid).toBeTrue();
    });
  }

  it('submits centavos as reais, includes the references and JSONB, and emits the returned ID once', () => {
    const { page, http, fixture } = setup();
    const created = jasmine.createSpy();
    page.productCreated.subscribe(created);
    page.form.patchValue({ name: ' Toalha ', price: '1234,5', quantity: 0, status: 'archived', category: 9, brand: 8, care: 'Secar à sombra' });
    page.addMeasurement();
    page.fields.measurements.at(0).setValue({ label: 'Largura', value: '70 cm' });
    page.formatPrice();
    fixture.detectChanges();
    expect(page.fields.price.value).toBe('1.234,50');
    expect(page.progress).toBe(100);
    expect(fixture.nativeElement.querySelector('.store-preview').textContent).toContain('Toalhas · Marca teste');
    page.onSubmit();
    page.onSubmit();
    const request = http.expectOne(url);
    expect(request.request.body).toEqual(jasmine.objectContaining({
      name: 'Toalha', price: 1234.5, quantity: 0, status: 'archived', product_type_id: 9, brand_id: 8,
      care_instructions: 'Secar à sombra', measurements: { Largura: '70 cm' },
    }));
    expect(request.request.body.sku).toBeUndefined();
    request.flush({ id: 21 });
    expect(created).toHaveBeenCalledOnceWith(21);
    page.onSubmit();
    http.expectNone(url);
  });

  it('keeps the form after failure and saves a draft as inactive', () => {
    const { page, http } = setup();
    const router = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    page.form.patchValue({ name: 'Toalha', category: 9, price: '0,01', quantity: 3, status: 'active' });
    page.onSubmit();
    http.expectOne(url).flush({}, { status: 500, statusText: 'Falha' });
    expect(page.fields.name.value).toBe('Toalha');
    expect(alerts.error).toHaveBeenCalled();
    page.onSubmit(true);
    const request = http.expectOne(url);
    expect(request.request.body.status).toBe('inactive');
    expect(request.request.body.price).toBe(0.01);
    request.flush({ id: 22 });
    expect(router).toHaveBeenCalledWith(['/admin/products']);
  });

  it('asks before discarding a dirty form', () => {
    const { page } = setup();
    expect(page.canLeave()).toBeTrue();
    page.form.markAsDirty();
    page.canLeave();
    expect(confirm).toHaveBeenCalled();
  });

  for (const kind of ['categories', 'brands'] as const) {
    it('creates and selects a ' + kind + ' entry while preserving the product', () => {
      const { page, http } = setup();
      const closed = new Subject<boolean>();
      confirm.and.returnValue({ afterClosed: () => closed });
      page.fields.name.setValue('Produto preservado');
      page.openRegistration(kind);
      const config = confirm.calls.mostRecent().args[0];
      page.registrationName.setValue('  Casa   Bela  ');
      (config.execute() as Observable<unknown>).subscribe();
      const request = http.expectOne('http://localhost:8080/admin/catalog/' + kind);
      expect(request.request.body).toEqual({ name: 'Casa Bela' });
      request.flush({ id: 39, name: 'Casa Bela' });
      closed.next(true);
      expect(page.fields[kind === 'categories' ? 'category' : 'brand'].value).toBe(39);
      expect(page.fields.name.value).toBe('Produto preservado');
    });
  }

  it('keeps the typed name and prior selection after API errors', () => {
    const { page, http } = setup();
    page.fields.category.setValue(9);
    page.openRegistration('categories');
    page.registrationName.setValue('Casa');
    const config = confirm.calls.mostRecent().args[0];
    for (const status of [400, 409, 500, 0]) {
      const failed = jasmine.createSpy();
      (config.execute() as Observable<unknown>).subscribe({ error: error => failed(config.errorMessage(error)) });
      const request = http.expectOne('http://localhost:8080/admin/catalog/categories');
      if (status) request.flush({}, { status, statusText: 'Falha' });
      else request.error(new ProgressEvent('error'));
      expect(failed).toHaveBeenCalledWith(jasmine.any(String));
      expect(page.registrationName.value).toBe('Casa');
      expect(page.fields.category.value).toBe(9);
    }
  });
});