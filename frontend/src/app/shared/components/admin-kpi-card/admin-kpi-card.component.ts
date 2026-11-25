import type { KpiVariant, KpiFormat } from '../../types/ui/kpi';
import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { HintDirective } from '../../directives/hint.directive';

@Component({
  selector: 'app-admin-kpi-card',
  standalone: true,
  imports: [MatIconModule, HintDirective],
  templateUrl: './admin-kpi-card.component.html',
  styleUrl: './admin-kpi-card.component.scss',
})
export class AdminKpiCardComponent {
  readonly title = input.required<string>();
  readonly value = input<number | string>(0);
  readonly description = input('');
  readonly icon = input('');
  readonly variant = input<KpiVariant>('default');
  readonly format = input<KpiFormat>('number');
  readonly loading = input(false);
  readonly tooltip = input('');
  readonly compact = input(false);
  readonly displayedValue = computed(() => {
    const value = this.value();
    if (typeof value === 'string' || this.format() === 'text')
      return String(value);
    const options: Intl.NumberFormatOptions =
      this.format() === 'currency'
        ? { style: 'currency', currency: 'BRL' }
        : this.format() === 'percent'
          ? { style: 'percent', maximumFractionDigits: 1 }
          : { maximumFractionDigits: 2 };
    return new Intl.NumberFormat('pt-BR', options).format(value);
  });
}
