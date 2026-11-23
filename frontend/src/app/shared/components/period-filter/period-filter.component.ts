import { Component, input, output } from '@angular/core';
import { AdminFiltersComponent, AdminFilterField } from '../admin-filters/admin-filters.component';
import { FormControl, FormGroup } from '@angular/forms';
@Component({selector:'app-period-filter',standalone:true,imports:[AdminFiltersComponent],templateUrl:'./period-filter.component.html',styleUrl:'./period-filter.component.scss'})
export class PeriodFilterComponent {
 readonly form=input.required<FormGroup<{period:FormControl<string>;dateFrom:FormControl<string>;dateTo:FormControl<string>;group:FormControl<string>}>>();
 readonly showGrouping=input(true);
 readonly applied=output<void>();
 fields(): AdminFilterField[] {
  const controls=this.form().controls;
  const fields:AdminFilterField[]=[{key:'period',type:'select',label:'Período',control:controls.period,options:[{value:'today',label:'Hoje'},{value:'7d',label:'Últimos 7 dias'},{value:'30d',label:'Últimos 30 dias'},{value:'month',label:'Este mês'},{value:'last_month',label:'Mês anterior'},{value:'custom',label:'Período personalizado'}]}];
  if(controls.period.value==='custom') fields.push({key:'period-date-from',type:'date',label:'Data inicial',control:controls.dateFrom,required:true},{key:'period-date-to',type:'date',label:'Data final',control:controls.dateTo,required:true});
  if(this.showGrouping()) fields.push({key:'group',type:'select',label:'Agrupamento',control:controls.group,options:[{value:'auto',label:'Automático'},{value:'day',label:'Por dia'},{value:'month',label:'Por mês'}]});
  return fields;
 }
}
