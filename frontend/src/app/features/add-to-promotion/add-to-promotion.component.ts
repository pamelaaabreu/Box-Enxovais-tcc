import { Component } from '@angular/core';
import { CreatePromotionComponent } from '../admin/promotions/promotion-manager/create-promotion.component';

@Component({
  selector: 'app-add-to-promotion',
  standalone: true,
  imports: [CreatePromotionComponent],
  templateUrl: './add-to-promotion.component.html',
  styleUrl: './add-to-promotion.component.scss',
})
export class AddToPromotionComponent {}
