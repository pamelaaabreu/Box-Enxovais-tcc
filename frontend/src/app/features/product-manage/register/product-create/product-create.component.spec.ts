import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ProductCreateComponent } from './product-create.component';

describe('Product creation stock', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [ProductCreateComponent],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  async function setup() {
    const fixture = TestBed.createComponent(ProductCreateComponent);
    fixture.componentInstance.product.name = 'Teste';
    fixture.componentInstance.product.price = 10;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }
  [0, 3].forEach(quantity => it(`submits ${quantity} from the form`, async () => {
    const fixture = await setup();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#quantity');
    input.value = String(quantity);
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-save');
    expect(button.disabled).toBeFalse();
    button.click();
    const request = TestBed.inject(HttpTestingController).expectOne('http://localhost:8080/products');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.quantity).toBe(quantity);
    request.flush({ id: 123 });
    expect(fixture.componentInstance.product.id).toBe(123);
  }));
  ['-1', '1.5', 'texto', ''].forEach(value => it(`blocks invalid input ${JSON.stringify(value)}`, async () => {
    const fixture = await setup();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#quantity');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.btn-save').disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('#quantity-error').textContent).toContain('quantidade inteira');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    TestBed.inject(HttpTestingController).expectNone('http://localhost:8080/products');
  }));
  [-1, 1.5, '3', null, undefined, NaN, 2147483648].forEach(value => it(`guards direct submit ${value}`, async () => {
    const fixture = await setup();
    fixture.componentInstance.product.quantity = value as number;
    fixture.componentInstance.onSubmit();
    expect(fixture.componentInstance.quantityError).toContain('quantidade inteira');
    TestBed.inject(HttpTestingController).expectNone('http://localhost:8080/products');
  }));
  it('prevents duplicate requests while saving', async () => {
    const fixture = await setup();
    fixture.componentInstance.onSubmit();
    fixture.componentInstance.onSubmit();
    expect(fixture.componentInstance.loading).toBeTrue();
    TestBed.inject(HttpTestingController).expectOne('http://localhost:8080/products').flush({ id: 1 });
    expect(fixture.componentInstance.loading).toBeFalse();
  });
});
