import { Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';

export interface AdminFilterOption { value: string; label: string; }
interface FilterBase { key: string; label: string; control: FormControl<string>; wide?: boolean; }
export type AdminFilterField = FilterBase & (
  { type: 'text' | 'search' | 'date'; placeholder?: string; maxlength?: number; required?: boolean; id?: string }
  | { type: 'select'; options: readonly AdminFilterOption[] }
);

@Component({ selector: 'app-admin-filters', standalone: true, imports: [ReactiveFormsModule, MatSelectModule], templateUrl: './admin-filters.component.html', styleUrl: './admin-filters.component.scss' })
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
