import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  MAT_TOOLTIP_DEFAULT_OPTIONS,
  MatTooltip,
} from '@angular/material/tooltip';
import { HintDirective } from './hint.directive';

@Component({
  standalone: true,
  imports: [HintDirective],
  template:
    '<article tabindex="0" appHint="Detalhes do indicador">Indicador</article>',
})
class HintHost {}

describe('Shared hints', () => {
  it('keeps the hint non-interactive so it cannot intercept adjacent controls', () => {
    const fixture = TestBed.createComponent(HintHost);
    fixture.detectChanges();
    const host = fixture.debugElement.query(By.directive(MatTooltip));
    expect(
      host.injector.get(MAT_TOOLTIP_DEFAULT_OPTIONS)
        .disableTooltipInteractivity,
    ).toBeTrue();
    expect(host.injector.get(MatTooltip).tooltipClass).toBe('box-hint');
    expect(host.nativeElement.getAttribute('tabindex')).toBe('0');
  });
});
