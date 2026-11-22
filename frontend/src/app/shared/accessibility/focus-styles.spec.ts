import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

@Component({
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule],
  template: `<button style="border-radius:20px">Ação</button>
    <nav class="navbar-custom"><a href="#" class="nav-link">Cama</a></nav>
    <input class="native" aria-label="Campo" /><mat-form-field
      ><mat-label>E-mail</mat-label><input matInput
    /></mat-form-field>`,
})
class FocusFixtureComponent {}

describe('shared focus styles', () => {
  it('uses one olive ring on native controls, a rounded inverse ring on dark navigation and one Material surface', () => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fixture = TestBed.createComponent(FocusFixtureComponent);
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    for (const selector of ['button', '.native', '.nav-link']) {
      const element = fixture.nativeElement.querySelector(
        selector,
      ) as HTMLElement;
      element.focus();
      const style = getComputedStyle(element);
      expect(style.outlineStyle).toBe('solid');
      expect(style.outlineWidth).toBe('2px');
      expect(style.boxShadow).toBe('none');
      expect(style.outlineColor).toBe(
        selector === '.nav-link' ? 'rgb(208, 223, 185)' : 'rgb(82, 102, 63)',
      );
    }
    const input = fixture.nativeElement.querySelector(
      'input[matInput]',
    ) as HTMLInputElement;
    input.focus();
    fixture.detectChanges();
    expect(getComputedStyle(input).outlineWidth).toBe('0px');
    const wrapper = fixture.nativeElement.querySelector(
      '.mat-mdc-text-field-wrapper',
    );
    expect(getComputedStyle(wrapper).outlineStyle).toBe('none');
    expect(
      getComputedStyle(wrapper)
        .getPropertyValue('--mdc-outlined-text-field-focus-outline-width')
        .trim(),
    ).toBe('2px');
    fixture.destroy();
  });
});
