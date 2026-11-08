import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  @Input() companyName = 'Box Enxovais LTDA';
  @Input() cnpj = '65.290.378/0001-00';
  @Input() address = 'Rua Exemplo, 123 — São Paulo / SP';
  @Input() phone = '+55 (19) 9923-2930';
  @Input() whatsappNumber = '+55XXXXXXXXX';
  @Input() showAddress = true;
}