import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

export interface AdminBreadcrumb {
  label: string;
  url?: string;
}

@Component({
  selector: 'app-admin-page-header',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  templateUrl: './admin-page-header.component.html',
  styleUrl: './admin-page-header.component.scss',
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
  get creationAction(): boolean {
    return /^(?:\+\s*)?(?:Nov[oa]\b|Cadastrar\b|Adicionar\b)/i.test(
      this.actionLabel,
    );
  }
  get actionText(): string {
    return this.creationAction
      ? this.actionLabel.replace(/^\+\s*/, '')
      : this.actionLabel;
  }
  @Output() action = new EventEmitter<void>();
}
