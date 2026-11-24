import { StateKind } from '../../types/ui/feedback';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  LucideAngularModule,
  SearchX,
  CloudOff,
  LoaderCircle,
  CheckCircle2,
  Heart,
  PackageOpen,
} from 'lucide-angular';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-state',
  standalone: true,
  imports: [LucideAngularModule, RouterLink],
  templateUrl: './admin-state.component.html',
  styleUrl: './admin-state.component.scss',
})
export class AdminStateComponent {
  @Input() kind: StateKind = 'empty';
  @Input() icon = '';
  @Input() layout: 'page' | 'section' | 'compact' = 'section';
  get stateIcon() {
    if (this.kind === 'error') return CloudOff;
    if (this.kind === 'loading') return LoaderCircle;
    if (this.kind === 'success') return CheckCircle2;
    if (this.icon.includes('favorite')) return Heart;
    return this.icon.includes('inventory') ? PackageOpen : SearchX;
  }
  @Input() title = '';
  @Input() description = '';
  @Input() actionLabel = '';
  @Input() actionLink = '';
  @Output() readonly action = new EventEmitter<void>();
}
