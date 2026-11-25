import { TestBed } from '@angular/core/testing';
import { ProductPriceComponent } from './product-price.component';

describe('ProductPrice storefront', () => {
  it('renders the regular price and updates its six installments when the price changes', () => {
    const fixture = TestBed.createComponent(ProductPriceComponent);
    fixture.componentRef.setInput('price', 299.9);
    fixture.detectChanges();
    const text = () =>
      [...fixture.nativeElement.children]
        .map((element: HTMLElement) => element.textContent?.trim())
        .join(' ')
        .replace(/\s+/g, ' ');
    expect(text()).toBe(
      'R$ 299,90 6 parcelas sem juros — de R$ 49,98 a R$ 49,99',
    );
    expect(fixture.nativeElement.querySelector('del, .discount')).toBeNull();
    fixture.componentRef.setInput('price', 400);
    fixture.detectChanges();
    expect(text()).toBe(
      'R$ 400,00 6 parcelas sem juros — de R$ 66,66 a R$ 66,67',
    );
  });
});
