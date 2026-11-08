import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-quantity-selector',
  standalone: true,
  templateUrl: './quantity-selector.component.html',
  styleUrl: './quantity-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuantitySelectorComponent {
  readonly value = input(1);
  readonly valueChange = output<number>();
  readonly quantity = computed(() => Number.isFinite(this.value()) ? Math.max(1, Math.floor(this.value())) : 1);

  change(delta: number): void {
    this.valueChange.emit(Math.max(1, this.quantity() + delta));
  }
}
