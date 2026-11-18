import {CustomAlertService} from '../../core/services/custom-alert.service';
import { Component } from '@angular/core';
import { AddToPromotionRequest, Product } from '../../shared/models';
import { PromoService } from '../../core/services/promo.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-to-promotion',
  imports: [CommonModule, FormsModule],
  templateUrl: './add-to-promotion.component.html',
  styleUrl: './add-to-promotion.component.css',
})
export class AddToPromotionComponent {
 saving=false;
  promotionData: AddToPromotionRequest = {
    promotion_name: '',
  };
  constructor(private promoService: PromoService,private alerts:CustomAlertService) {}

  onSubmit(): void {
 if(this.saving)return;
    if (
      this.promotionData.product_id &&
      this.promotionData.promotion_name &&
      Number.isFinite(this.promotionData.promotional_price) && this.promotionData.promotional_price!>=0
    ) {
      this.saving=true;
      this.promoService.addProductToPromotion(this.promotionData).subscribe({
        next: (response) => {
          this.saving=false;this.alerts.success('Produto adicionado à campanha');
          this.resetForm();
        },
        error: (error) => {
          this.saving=false;this.alerts.error('Não foi possível adicionar',error.error?.message||'Confira os dados e tente novamente.');
        },
      });
    } else {
      this.alerts.error('Confira os campos','Informe o produto, a campanha e um preço promocional válido.');
    }
  }

  resetForm(): void {
    this.promotionData = {
      promotion_name: '',
    };
  }
}
