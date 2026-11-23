import { Component, Input, ViewEncapsulation } from '@angular/core';
import { AdminStateComponent } from '../admin-state/admin-state.component';
@Component({ selector: 'app-admin-data-table', standalone: true, imports: [AdminStateComponent], templateUrl: './admin-data-table.component.html', styleUrl: './admin-data-table.component.scss', encapsulation: ViewEncapsulation.None })
export class AdminDataTableComponent {
 @Input() label = 'Tabela administrativa';
 @Input() responsive: 'cards' | 'scroll' = 'cards';
 @Input() empty = false;
 @Input() emptyTitle = 'Nenhum registro encontrado';
 @Input() emptyDescription = '';
}
