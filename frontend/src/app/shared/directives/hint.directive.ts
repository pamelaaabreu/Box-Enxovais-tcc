import { Directive, inject } from '@angular/core';
import {
  MAT_TOOLTIP_DEFAULT_OPTIONS,
  MatTooltip,
} from '@angular/material/tooltip';

@Directive({
  selector: '[appHint]',
  standalone: true,
  providers: [
    {
      provide: MAT_TOOLTIP_DEFAULT_OPTIONS,
      useFactory: () => ({
        ...inject(MAT_TOOLTIP_DEFAULT_OPTIONS, { skipSelf: true }),
        disableTooltipInteractivity: true,
      }),
    },
  ],
  hostDirectives: [{ directive: MatTooltip, inputs: ['matTooltip: appHint'] }],
})
export class HintDirective {
  constructor() {
    const tooltip = inject(MatTooltip);
    tooltip.tooltipClass = 'box-hint';
    tooltip.showDelay = 180;
    tooltip.position = 'above';
  }
}
