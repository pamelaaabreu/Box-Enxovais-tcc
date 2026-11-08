import { TestBed } from '@angular/core/testing';
import { ProductPriceComponent } from './product-price.component';

describe('ProductPrice storefront', () => {
  it('renders the regular price and updates its four installments when the price changes', () => {
    const fixture = TestBed.createComponent(ProductPriceComponent);
    fixture.componentRef.setInput('price', 299.9);
    fixture.detectChanges();
    const text = () => [...fixture.nativeElement.children].map((element: any) => element.textContent.trim()).join(' ').replace(/\s+/g, ' ');
    expect(text()).toBe('R$ 299,90 ou 4x de R$ 74,98 sem juros');
    expect(fixture.nativeElement.querySelector('del, .discount')).toBeNull();
    fixture.componentRef.setInput('price', 400);
    fixture.detectChanges();
    expect(text()).toBe('R$ 400,00 ou 4x de R$ 100,00 sem juros');
  });
});
