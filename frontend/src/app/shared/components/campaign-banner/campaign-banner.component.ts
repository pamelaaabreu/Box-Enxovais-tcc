import { Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-campaign-banner',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './campaign-banner.component.html',
  styleUrl: './campaign-banner.component.scss',
})
export class CampaignBannerComponent {
  readonly name = input('');
  readonly description = input('');
  readonly image = input('');
  readonly link = input<string | null>(null);
  readonly failed = signal('');
}
