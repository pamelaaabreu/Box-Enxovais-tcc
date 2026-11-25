import { variantForm } from '../../../../../../shared/forms/product-variants';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, Observable } from 'rxjs';
import { ProductCreateComponent } from './product-create.component';
import { CustomAlertService } from '../../../../../../core/services/custom-alert.service';
import { ConfirmDialogService } from '../../../../../../shared/components/confirm-dialog/confirm-dialog.service';

describe('ProductCreateComponent', () => {
  const url = 'http://localhost:8080/products';
  let alerts: { success: jasmine.Spy; error: jasmine.Spy };
  let confirm: jasmine.Spy;
  beforeEach(() => {
    alerts = { success: jasmine.createSpy(), error: jasmine.createSpy() };
    confirm = jasmine
      .createSpy()
      .and.returnValue({ afterClosed: () => of(false) });
    TestBed.configureTestingModule({
      imports: [ProductCreateComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CustomAlertService, useValue: alerts },
        { provide: ConfirmDialogService, useValue: { open: confirm } },
      ],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function setup() {
    const fixture = TestBed.createComponent(ProductCreateComponent);
    const http = TestBed.inject(HttpTestingController);
    const page = fixture.componentInstance;
    http.expectOne(url + '/categories').flush([{ id: 9, name: 'Toalhas' }]);
    http
      .expectOne('http://localhost:8080/admin/products/brands')
      .flush([{ id: 8, name: 'Marca teste' }]);
    fixture.detectChanges();
    return { fixture, page, http };
  }

  it('explains automatic SKU and has no editable SKU field', () => {
    const { fixture, page } = setup();
    expect(page.form.get('sku')).toBeNull();
    expect(fixture.nativeElement.querySelector('#product-sku')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'O SKU será gerado automaticamente após salvar o produto.',
    );
  });

  it('masks typed digits as cents and strips letters and pasted formatting', () => {
    const { fixture, page } = setup();
    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('#product-price');
    const type = (value: string) => {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
    };
    for (const [raw, formatted] of [
      ['1', '0,01'],
      ['0,012', '0,12'],
      ['0,123', '1,23'],
      ['1,234', '12,34'],
      ['R$ 1.234,56', '1.234,56'],
      ['12a3', '1,23'],
      ['abc', ''],
      ['99999999999', '99.999.999,99'],
    ]) {
      type(raw);
      expect(input.value).withContext(raw).toBe(formatted);
      expect(page.fields.price.value).toBe(formatted);
    }
    type('');
    expect(page.fields.price.invalid).toBeTrue();
    type('0');
    expect(input.value).toBe('0,00');
    expect(page.fields.price.invalid).toBeTrue();
  });

  it('creates real variants, derives totals and omits the generic size characteristic', () => {
    const { fixture, page, http } = setup();
    page.form.patchValue({
      name: 'Edredom teste',
      category: 9,
      price: '10,00',
      quantity: 1,
      size: 'Genérico',
    });
    page.fields.variants.push(
      variantForm({
        id: 0,
        size: 'Solteiro',
        dimensions: '160 × 220 cm',
        price: 249.9,
        stock: 2,
      }),
    );
    page.fields.variants.push(
      variantForm({
        id: 0,
        size: 'Queen',
        dimensions: '240 × 260 cm',
        price: 329.9,
        stock: 3,
      }),
    );
    fixture.detectChanges();
    expect(page.fields.price.value).toBe('10,00');
    expect(page.fields.quantity.value).toBe(1);
    expect(page.fields.price.disabled).toBeTrue();
    expect(page.fields.quantity.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('#product-size')).toBeNull();
    page.onSubmit();
    const req = http.expectOne(url);
    expect(req.request.body.variants.length).toBe(2);
    expect(req.request.body.variants[1].price).toBe(329.9);
    expect(req.request.body.quantity).toBe(5);
    expect(req.request.body.measurements.Tamanho).toBeUndefined();
    req.flush({ id: 25 });
  });

  it('preserves size when adding, editing and removing variants and restores the field', () => {
    const { fixture, page, http } = setup();
    page.form.patchValue({
      name: 'Produto teste',
      category: 9,
      price: '49,90',
      quantity: 2,
      size: '70 × 140 cm',
    });
    expect(fixture.nativeElement.querySelector('#product-size')).not.toBeNull();
    page.fields.variants.push(
      variantForm({
        id: 0,
        size: 'Casal',
        dimensions: '220 × 240 cm',
        price: 249.9,
        stock: 2,
      }),
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#product-size')).toBeNull();
    expect(page.fields.size.value).toBe('70 × 140 cm');
    page.fields.variants.at(0).controls.dimensions.setValue('240 × 260 cm');
    fixture.detectChanges();
    expect(page.fields.size.value).toBe('70 × 140 cm');
    page.fields.variants.removeAt(0);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#product-size').value).toBe(
      '70 × 140 cm',
    );
    page.onSubmit();
    const req = http.expectOne(url);
    expect(req.request.body.measurements.Tamanho).toBe('70 × 140 cm');
    expect(req.request.body.variants).toEqual([]);
    req.flush({ id: 26 });
  });

  it('switches commerce modes without overwriting simple values and blocks invalid variants', () => {
    const { fixture, page, http } = setup();
    page.form.patchValue({
      name: 'Teste',
      category: 9,
      price: '89,90',
      quantity: 7,
    });
    page.fields.price.markAsTouched();
    page.fields.variants.push(variantForm());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#product-price')).toBeNull();
    expect(fixture.nativeElement.querySelector('#quantity')).toBeNull();
    expect(fixture.nativeElement.querySelector('#price-error')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Valores calculados automaticamente a partir das variações.',
    );
    page.onSubmit();
    http.expectNone(url);
    page.fields.variants.at(0).patchValue({
      size: 'Solteiro',
      dimensions: '160 × 220 cm',
      price: '249,90',
      stock: 8,
    });
    page.fields.variants.push(
      variantForm({
        id: 0,
        size: 'Casal',
        dimensions: '220 × 240 cm',
        price: 289.9,
        stock: 8,
      }),
    );
    page.fields.variants.push(
      variantForm({
        id: 0,
        size: 'Queen',
        dimensions: '240 × 260 cm',
        price: 329.9,
        stock: 8,
      }),
    );
    fixture.detectChanges();
    const summary = fixture.nativeElement.querySelector(
      'app-product-commerce-summary',
    );
    expect(summary.textContent).toContain('R$ 249,90');
    expect(summary.textContent).toContain('24 unidades');
    page.fields.variants.at(0).patchValue({ price: '349,90', stock: 2 });
    fixture.detectChanges();
    expect(summary.textContent).toContain('R$ 289,90');
    expect(summary.textContent).toContain('18 unidades');
    page.fields.variants.clear();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#product-price').value).toBe(
      '89,90',
    );
    expect(page.fields.quantity.value).toBe(7);
    expect(page.fields.price.enabled).toBeTrue();
    expect(page.fields.quantity.enabled).toBeTrue();
    page.onSubmit();
    const req = http.expectOne(url);
    expect(req.request.body.price).toBe(89.9);
    expect(req.request.body.quantity).toBe(7);
    req.flush({ id: 27 });
  });

  it('starts pending, rejects invalid fields and renders the checklist and name counter', () => {
    const { fixture, page, http } = setup();
    expect(page.progress).toBe(20);
    page.form.patchValue({
      name: ' ',
      price: '-2',
      quantity: 1.5,
      status: 'draft',
    });
    page.onSubmit();
    expect(page.form.invalid).toBeTrue();
    http.expectNone(url);
    page.fields.name.setValue('Toalha');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('6/100');
    expect(
      fixture.nativeElement.querySelector('.store-preview').textContent,
    ).toContain('Toalha');
    expect(
      fixture.nativeElement.querySelector('#quantity-error'),
    ).not.toBeNull();
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
    page.form.patchValue({
      name: ' Toalha ',
      price: '1234,5',
      quantity: 0,
      status: 'archived',
      category: 9,
      brand: 8,
      care: 'Secar à sombra',
    });
    page.addMeasurement();
    page.fields.measurements
      .at(0)
      .setValue({ label: 'Largura', value: '70 cm' });
    page.formatPrice();
    fixture.detectChanges();
    expect(page.fields.price.value).toBe('1.234,50');
    expect(page.progress).toBe(100);
    expect(
      fixture.nativeElement.querySelector('.store-preview').textContent,
    ).toContain('Toalhas · Marca teste');
    page.onSubmit();
    page.onSubmit();
    const request = http.expectOne(url);
    expect(request.request.body).toEqual(
      jasmine.objectContaining({
        name: 'Toalha',
        price: 1234.5,
        quantity: 0,
        status: 'archived',
        product_type_id: 9,
        brand_id: 8,
        care_instructions: 'Secar à sombra',
        measurements: { Largura: '70 cm' },
      }),
    );
    expect(request.request.body.sku).toBeUndefined();
    request.flush({ id: 21 });
    expect(created).toHaveBeenCalledOnceWith(21);
    page.onSubmit();
    http.expectNone(url);
  });

  it('keeps the form after failure and saves a draft as inactive', () => {
    const { page, http } = setup();
    const router = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(
      true,
    );
    page.form.patchValue({
      name: 'Toalha',
      category: 9,
      price: '0,01',
      quantity: 3,
      status: 'active',
    });
    page.onSubmit();
    http.expectOne(url).flush({}, { status: 500, statusText: 'Falha' });
    expect(page.fields.name.value).toBe('Toalha');
    expect(alerts.error).toHaveBeenCalled();
    page.onSubmit(true);
    const request = http.expectOne(url);
    expect(request.request.body.status).toBe('inactive');
    expect(request.request.body.price).toBe(0.01);
    request.flush({ id: 22 });
    expect(router).toHaveBeenCalledWith(['/admin/produtos']);
  });

  it('keeps the characteristic action beside material and color and removes added rows', () => {
    const { fixture, page } = setup();
    const host = fixture.nativeElement as HTMLElement;
    const grid = host.querySelector('.standard-characteristics')!;
    const children = Array.from(grid.children);
    expect(children[0].querySelector('#product-material')).not.toBeNull();
    expect(children[1].querySelector('#product-color')).not.toBeNull();
    const add = children[2] as HTMLButtonElement;
    expect(add.classList.contains('add-characteristic')).toBeTrue();
    add.click();
    fixture.detectChanges();
    expect(page.fields.measurements.length).toBe(1);
    (
      host.querySelector(
        '[aria-label="Remover característica 1"]',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(page.fields.measurements.length).toBe(0);
    expect(host.querySelector('#product-care')).not.toBeNull();
  });

  it('asks before discarding a dirty form', () => {
    const { page } = setup();
    expect(page.canLeave()).toBeTrue();
    page.form.markAsDirty();
    page.canLeave();
    expect(confirm).toHaveBeenCalled();
  });

  for (const kind of ['categories', 'brands'] as const) {
    it(
      'creates and selects a ' + kind + ' entry while preserving the product',
      () => {
        const { page, http } = setup();
        const closed = new Subject<boolean>();
        confirm.and.returnValue({ afterClosed: () => closed });
        page.fields.name.setValue('Produto preservado');
        page.openRegistration(kind);
        const config = confirm.calls.mostRecent().args[0];
        page.registrationName.setValue('  Casa   Bela  ');
        (config.execute() as Observable<unknown>).subscribe();
        const request = http.expectOne(
          'http://localhost:8080/admin/catalog/' + kind,
        );
        expect(request.request.body).toEqual({ name: 'Casa Bela' });
        request.flush({ id: 39, name: 'Casa Bela' });
        closed.next(true);
        expect(
          page.fields[kind === 'categories' ? 'category' : 'brand'].value,
        ).toBe(39);
        expect(page.fields.name.value).toBe('Produto preservado');
      },
    );
  }

  it('keeps the typed name and prior selection after API errors', () => {
    const { page, http } = setup();
    page.fields.category.setValue(9);
    page.openRegistration('categories');
    page.registrationName.setValue('Casa');
    const config = confirm.calls.mostRecent().args[0];
    for (const status of [400, 409, 500, 0]) {
      const failed = jasmine.createSpy();
      (config.execute() as Observable<unknown>).subscribe({
        error: (error) => failed(config.errorMessage(error)),
      });
      const request = http.expectOne(
        'http://localhost:8080/admin/catalog/categories',
      );
      if (status) request.flush({}, { status, statusText: 'Falha' });
      else request.error(new ProgressEvent('error'));
      expect(failed).toHaveBeenCalledWith(jasmine.any(String));
      expect(page.registrationName.value).toBe('Casa');
      expect(page.fields.category.value).toBe(9);
    }
  });

  it('loads existing data and saves only the editable contract without regenerating SKU', () => {
    const fixture = TestBed.createComponent(ProductCreateComponent),
      page = fixture.componentInstance,
      http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('editId', 42);
    http.expectOne(url + '/categories').flush([{ id: 9, name: 'Toalhas' }]);
    http
      .expectOne('http://localhost:8080/admin/products/brands')
      .flush([{ id: 8, name: 'Box Enxovais' }]);
    fixture.detectChanges();
    const product = {
      id: 42,
      sku: 'BX-TOA-042',
      name: 'Original',
      description: 'Descrição',
      brand_id: 8,
      product_type_id: 9,
      status: 'active',
      price: 89.9,
      quantity: 4,
      updated_at: '2026-11-20T12:00:00Z',
      measurements: {
        Material: 'Algodão',
        Cor: 'Areia',
        Acabamento: 'Barra'.repeat(50),
        coordinated_family: 'preservada',
      },
      variants: [],
      promotional_price: 0,
    };
    http.expectOne('http://localhost:8080/admin/products/42').flush(product);
    fixture.detectChanges();
    http.expectOne(url + '/42').flush(product);
    expect(page.fields.name.value).toBe('Original');
    expect(page.form.pristine).toBeTrue();
    expect(page.form.valid).toBeTrue();
    expect(
      fixture.nativeElement.querySelector('app-product-sku input').readOnly,
    ).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Salvar alterações');
    page.fields.name.setValue('Editado');
    page.fields.color.setValue('Oliva');
    page.fields.price.setValue('99,90');
    page.removeMeasurement(0);
    const updated = jasmine.createSpy();
    page.productUpdated.subscribe(updated);
    page.onSubmit();
    const request = http.expectOne('http://localhost:8080/admin/products/42');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body.sku).toBeUndefined();
    expect(request.request.body.updated_at).toBeUndefined();
    expect(request.request.body.expected_updated_at).toBe(product.updated_at);
    expect(request.request.body.measurements).toEqual({
      Material: 'Algodão',
      Cor: 'Oliva',
      coordinated_family: 'preservada',
    });
    expect(request.request.body.commerce).toEqual({
      price: 99.9,
      quantity: 4,
      expected_price: 89.9,
      expected_quantity: 4,
    });
    request.flush({ ...product, name: 'Editado', price: 99.9 });
    expect(updated).toHaveBeenCalledOnceWith(42);
    expect(page.form.pristine).toBeTrue();
    http.expectNone((request) => request.method === 'POST');
  });

  it('keeps edits after HTTP conflict and still confirms cancellation', () => {
    const { page, http } = setup();
    page.editId = 42;
    page.loadProduct();
    const product = {
      id: 42,
      name: 'Original',
      sku: 'BX-TOA-042',
      product_type_id: 9,
      status: 'active',
      price: 89.9,
      quantity: 4,
      updated_at: '2026-11-20T12:00:00Z',
      measurements: {},
      variants: [],
    };
    http.expectOne('http://localhost:8080/admin/products/42').flush(product);
    page.fields.name.setValue('Preservado');
    page.form.markAsDirty();
    page.onSubmit();
    http
      .expectOne('http://localhost:8080/admin/products/42')
      .flush(
        { message: 'Estoque alterado' },
        { status: 409, statusText: 'Conflict' },
      );
    expect(page.fields.name.value).toBe('Preservado');
    expect(page.form.dirty).toBeTrue();
    expect(alerts.error).toHaveBeenCalledWith(
      'Não foi possível atualizar o produto.',
      'Estoque alterado',
    );
    const result = page.canLeave() as Observable<boolean>;
    result.subscribe((value) => expect(value).toBeFalse());
    expect(confirm).toHaveBeenCalled();
  });
});
