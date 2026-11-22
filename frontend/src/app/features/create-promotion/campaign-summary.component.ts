import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CreatePromotionRequest } from '../../shared/models';
@Component({
  selector: 'app-campaign-summary',
  standalone: true,
  imports: [DatePipe, MatIconModule],
  templateUrl: './campaign-summary.component.html',
  styleUrl: './campaign-summary.component.scss',
})
export class CampaignSummaryComponent {
  @Input({required: true}) promotionData!: CreatePromotionRequest;
  @Input() readyForHome = false;
  @Input() homeSummary = '';
  @Input() hasAvailableParticipants = false;
  @Input() hasValidImage = false;
  @Input() generalError = false;
  @Input() validPeriod = false;
  @Input() hasConfiguredDiscount = false;
  @Input() discountSummary = '';
  @Input() discountedProductCount = 0;
  get discountText(): string {
    const products = `${this.discountedProductCount} ${this.discountedProductCount === 1 ? 'produto' : 'produtos'}`;
    return this.discountSummary.endsWith('%') ? `${this.discountSummary} de desconto em ${products}` : `Descontos por produto: ${products}`;
  }
  @Input() dirty = false;
  @Output() readonly tabChange = new EventEmitter<number>();
  chooseTab(tab: number): void { this.tabChange.emit(tab); }
}

