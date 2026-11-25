import { NoticeKind } from '../../types/ui/feedback';
import { Component, Input } from '@angular/core';
@Component({
  selector: 'app-inline-notice',
  standalone: true,
  templateUrl: './inline-notice.component.html',
  styleUrl: './inline-notice.component.scss',
})
export class InlineNoticeComponent {
  @Input() kind: NoticeKind = 'error';
}
