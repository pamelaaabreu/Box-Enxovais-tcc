import type { FormControl, FormGroup } from '@angular/forms';
export type PeriodFilterForm = FormGroup<{
  period: FormControl<string>;
  dateFrom: FormControl<string>;
  dateTo: FormControl<string>;
  group: FormControl<string>;
}>;
