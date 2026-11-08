import { TestBed } from '@angular/core/testing';
import { QuantitySelectorComponent } from './quantity-selector.component';

describe('QuantitySelectorComponent', () => {
  it('never emits a quantity below one', () => {
    const fixture = TestBed.createComponent(QuantitySelectorComponent);
    const emitted: number[] = [];
    fixture.componentInstance.valueChange.subscribe(value => emitted.push(value));
    fixture.componentInstance.change(-1);
    expect(emitted).toEqual([1]);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBeTrue();
  });
  it('normalizes a zero value supplied by a parent', () => {
    const fixture = TestBed.createComponent(QuantitySelectorComponent);
    fixture.componentRef.setInput('value', 0);
    fixture.detectChanges();
    expect(fixture.componentInstance.quantity()).toBe(1);
    expect(fixture.nativeElement.querySelector('output').textContent.trim()).toBe('1');
  });
  it('communicates increments and decrements to its parent', () => {
    const fixture = TestBed.createComponent(QuantitySelectorComponent);
    fixture.componentRef.setInput('value', 3);
    const emitted: number[] = [];
    fixture.componentInstance.valueChange.subscribe(value => emitted.push(value));
    fixture.componentInstance.change(1);
    fixture.componentInstance.change(-1);
    expect(emitted).toEqual([4, 2]);
  });
});
