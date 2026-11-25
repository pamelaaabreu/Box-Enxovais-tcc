import type { FormControl } from '@angular/forms';

export interface AdminFilterOption {
  value: string;
  label: string;
}
export interface FilterBase {
  key: string;
  label: string;
  control: FormControl<string>;
  wide?: boolean;
}
export type AdminFilterField = FilterBase &
  (
    | {
        type: 'text' | 'search' | 'date';
        placeholder?: string;
        maxlength?: number;
        required?: boolean;
        id?: string;
      }
    | { type: 'select'; options: readonly AdminFilterOption[] }
  );
