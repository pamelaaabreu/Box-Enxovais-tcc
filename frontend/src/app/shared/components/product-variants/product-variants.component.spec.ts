import { TestBed } from '@angular/core/testing';
import { ProductVariantsComponent } from './product-variants.component';
import {
  variantsArray,
  variantForm,
  variantPayload,
} from '../../forms/product-variants';
describe('ProductVariantsComponent', () => {
  it('adds and removes optional variations and detects invalid or repeated sizes', () => {
    const fixture = TestBed.createComponent(ProductVariantsComponent),
      rows = variantsArray();
    fixture.componentRef.setInput('variants', rows);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    expect(rows.length).toBe(1);
    expect(rows.invalid).toBeTrue();
    rows.at(0).patchValue({
      size: 'Casal',
      dimensions: '220 × 240 cm',
      price: '289,90',
      stock: 2,
    });
    expect(rows.valid).toBeTrue();
    rows.push(
      variantForm({
        id: 0,
        size: ' casal ',
        dimensions: '240 × 260 cm',
        price: 329.9,
        stock: 3,
      }),
    );
    expect(rows.hasError('duplicateSizes')).toBeTrue();
    rows.at(1).controls.size.setValue('Queen');
    expect(rows.valid).toBeTrue();
    expect(variantPayload(rows)[1].stock).toBe(3);
    fixture.componentInstance.remove(1);
    fixture.componentInstance.remove(0);
    expect(rows.valid).toBeTrue();
    expect(rows.length).toBe(0);
  });
  it('keeps the existing currency mask on variant prices', () => {
    const fixture = TestBed.createComponent(ProductVariantsComponent),
      rows = variantsArray();
    rows.push(variantForm());
    fixture.componentRef.setInput('variants', rows);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      '[formControlName="price"]',
    );
    input.value = '32990abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(rows.at(0).controls.price.value).toBe('329,90');
  });
  it('summarizes zero, one and multiple variations from their current values', () => {
    const fixture = TestBed.createComponent(ProductVariantsComponent),
      rows = variantsArray();
    fixture.componentRef.setInput('variants', rows);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.variant-summary')).toBeNull();
    rows.push(
      variantForm({
        id: 1,
        size: 'Solteiro',
        dimensions: '160 × 220 cm',
        price: 249.9,
        stock: 8,
      }),
    );
    fixture.detectChanges();
    expect(
      fixture.nativeElement
        .querySelector('.variant-summary')
        .textContent.replace(/\s+/g, ' ')
        .trim(),
    ).toContain('1 variação · 8 unidades em estoque');
    rows.push(
      variantForm({
        id: 2,
        size: 'Casal',
        dimensions: '220 × 240 cm',
        price: 289.9,
        stock: 8,
      }),
    );
    rows.push(
      variantForm({
        id: 3,
        size: 'Queen',
        dimensions: '240 × 260 cm',
        price: 329.9,
        stock: 8,
      }),
    );
    fixture.detectChanges();
    expect(
      fixture.nativeElement
        .querySelector('.variant-summary')
        .textContent.replace(/\s+/g, ' ')
        .trim(),
    ).toContain('3 variações · 24 unidades em estoque · A partir de R$ 249,90');
    rows.at(0).controls.price.setValue('359,90');
    rows.at(1).controls.stock.setValue(2);
    fixture.detectChanges();
    expect(fixture.componentInstance.startingPrice).toBe('R$ 289,90');
    expect(fixture.componentInstance.totalStock).toBe(18);
    expect(
      fixture.nativeElement.querySelector('.remove').getAttribute('aria-label'),
    ).toContain('Solteiro');
    expect(
      fixture.nativeElement.querySelector('.remove mat-icon').textContent,
    ).toContain('delete_outline');
  });

  it('keeps new rows quiet until interaction and associates errors with the inputs', () => {
    const fixture = TestBed.createComponent(ProductVariantsComponent),
      rows = variantsArray();
    fixture.componentRef.setInput('variants', rows);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('app-admin-state'),
    ).not.toBeNull();
    fixture.componentInstance.add();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.variant-card .error'),
    ).toBeNull();
    rows.at(0).markAllAsTouched();
    fixture.detectChanges();
    const error = fixture.nativeElement.querySelector('.variant-card .error');
    expect(error.getAttribute('role')).toBe('alert');
    for (const input of fixture.nativeElement.querySelectorAll(
      '.variant-card input',
    ))
      expect(input.getAttribute('aria-describedby')).toBe(error.id);
  });
});
