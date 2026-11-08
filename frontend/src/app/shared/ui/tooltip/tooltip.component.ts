import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tooltip',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './tooltip.component.html',
  styleUrl: './tooltip.component.css',
})
export class TooltipComponent {
  @Input() text: string = 'Dica não informada.';

  isTooltipVisible = false;
}
