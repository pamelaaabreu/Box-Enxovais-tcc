import { Component, Input } from '@angular/core';
import type { StatusTone } from '../../types/ui/status-tone';
@Component({
  selector: 'app-status-badge',
  standalone: true,
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
})
export class StatusBadgeComponent {
  @Input() tone: StatusTone = 'neutral';
}
