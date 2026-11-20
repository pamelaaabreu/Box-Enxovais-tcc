import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

export interface AdminBreadcrumb { label: string; url?: string; }

@Component({
  selector: 'app-admin-page-header',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    @if (breadcrumb.length > 1) {
      <nav aria-label="Breadcrumb">
        @for (item of breadcrumb; track $index; let last = $last) {
          @if (item.url && !last) { <a [routerLink]="item.url">{{ item.label }}</a> }
          @else { <span [attr.aria-current]="last ? 'page' : null">{{ item.label }}</span> }
          @if (!last) { <span aria-hidden="true">/</span> }
        }
      </nav>
    }
    <header [class.compact]="compact">
      <div class="heading">
        @if (icon) { <span class="icon"><mat-icon fontSet="material-icons" aria-hidden="true">{{ icon }}</mat-icon></span> }
        <div class="copy">
          <div class="title"><h1 [id]="titleId">{{ title }}</h1><ng-content select="[header-label]" /></div>
          @if (description) { <p>{{ description }}</p> }
        </div>
      </div>
      <div class="actions">
        @if (actionLabel) {
          @if (actionLink) { <a class="primary-action" [routerLink]="actionLink">{{ actionLabel }}</a> }
          @else { <button class="primary-action" type="button" [disabled]="actionDisabled" (click)="action.emit()">{{ actionLabel }}</button> }
        }
        <ng-content select="[header-actions]" />@if (status) { <span class="status">{{ status }}</span> }</div>
    </header>
  `,
  styleUrl: './admin-page-header.component.css',
})
export class AdminPageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() description = '';
  @Input() breadcrumb: AdminBreadcrumb[] = [];
  @Input() icon = '';
  @Input() status = '';
  @Input() compact = false;
  @Input() titleId: string | null = null;
  @Input() actionLabel = '';
  @Input() actionLink = '';
  @Input() actionDisabled = false;
  @Output() action = new EventEmitter<void>();
}
