import { Component, input, output } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
@Component({selector:'app-period-filter',standalone:true,imports:[ReactiveFormsModule, MatSelectModule],templateUrl:'./period-filter.component.html',styleUrl:'./period-filter.component.scss'})
export class PeriodFilterComponent {
 readonly form=input.required<FormGroup<{period:FormControl<string>;dateFrom:FormControl<string>;dateTo:FormControl<string>;group:FormControl<string>}>>();
 readonly showGrouping=input(true);
 readonly applied=output<void>();
}
