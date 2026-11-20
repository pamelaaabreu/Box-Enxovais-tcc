import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-state',
  standalone: true,
  imports: [MatIconModule, RouterLink],
  template: `
    <section [attr.role]="kind === 'error' ? 'alert' : 'status'" [attr.aria-busy]="kind === 'loading'">
      <span class="state-icon" aria-hidden="true"><mat-icon>{{ icon || (kind === 'error' ? 'cloud_off' : kind === 'loading' ? 'hourglass_empty' : 'search_off') }}</mat-icon></span>
      <h2>{{ title }}</h2>
      @if (description) { <p>{{ description }}</p> }
      @if (actionLabel) {
        @if (actionLink) { <a [routerLink]="actionLink">{{ actionLabel }}</a> }
        @else { <button type="button" (click)="action.emit()">{{ actionLabel }}</button> }
      }
    </section>
  `,
  styleUrl: './admin-state.component.css',
})
export class AdminStateComponent {
  @Input() kind: 'empty' | 'error' | 'loading' = 'empty';
  @Input() icon = '';
  @Input() title = '';
  @Input() description = '';
  @Input() actionLabel = '';
  @Input() actionLink = '';
  @Output() readonly action = new EventEmitter<void>();
}
