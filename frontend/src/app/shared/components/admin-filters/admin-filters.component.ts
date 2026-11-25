import { Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';

import type { AdminFilterField } from '../../types/ui/admin-filters';

@Component({
  selector: 'app-admin-filters',
  standalone: true,
  imports: [ReactiveFormsModule, MatSelectModule],
  templateUrl: './admin-filters.component.html',
  styleUrl: './admin-filters.component.scss',
})
export class AdminFiltersComponent {
  readonly fields = input.required<readonly AdminFilterField[]>();
  readonly applyLabel = input('Filtrar');
  readonly clearLabel = input('Limpar');
  readonly showClear = input(true);
  readonly label = input('Filtros da listagem');
  readonly disabled = input(false);
  readonly applied = output<void>();
  readonly cleared = output<void>();
}
