import {MatSelectModule} from '@angular/material/select';
import {CustomAlertService} from '../../core/services/custom-alert.service';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CreatePromotionRequest } from '../../shared/models';
import { PromoService } from '../../core/services/promo.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-create-promotion',
  templateUrl: './create-promotion.component.html',
  styleUrl: './create-promotion.component.css',
  standalone: true,
  imports: [FormsModule, MatIconModule,MatSelectModule]
})
export class CreatePromotionComponent {
 saving=false;
  promotionData: CreatePromotionRequest = {
    name: '',
    status: 'active',
    start_date: new Date().toISOString().slice(0, 16),
    end_date: new Date().toISOString().slice(0, 16)
  };

  constructor(private promoService: PromoService,private alerts:CustomAlertService) { }

  onSubmit(): void {
 if(this.saving)return;this.saving=true;
    this.promoService.createPromotion(this.promotionData).subscribe({
      next: (response) => {
 this.saving=false;
        this.alerts.success('Promoção criada','A campanha foi cadastrada.');
        this.resetForm();
      },
      error: (error) => {
 this.saving=false;
        this.alerts.error('Não foi possível criar a campanha',error.error?.message||'Tente novamente.');
      }
    });
  }

  resetForm(): void {
    this.promotionData = {
      name: '',
      status: 'active',
      start_date: new Date().toISOString().slice(0, 16),
      end_date: new Date().toISOString().slice(0, 16)
    };
  }
}