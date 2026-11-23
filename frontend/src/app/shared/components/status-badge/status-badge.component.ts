import { Component, Input } from '@angular/core';
export type StatusTone = 'success' | 'danger' | 'neutral' | 'warning';
@Component({ selector: 'app-status-badge', standalone: true, templateUrl: './status-badge.component.html', styleUrl: './status-badge.component.scss' })
export class StatusBadgeComponent { @Input() tone: StatusTone = 'neutral'; }
