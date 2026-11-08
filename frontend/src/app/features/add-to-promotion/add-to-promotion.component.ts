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
  promotionData: AddToPromotionRequest = {
    promotion_name: '',
  };
  constructor(private promoService: PromoService) {}

  onSubmit(): void {
    if (
      this.promotionData.product_id &&
      this.promotionData.promotion_name &&
      this.promotionData.promotional_price
    ) {
      this.promoService.addProductToPromotion(this.promotionData).subscribe({
        next: (response) => {
          alert('Produto adicionado à promoção com sucesso!');
          this.resetForm();
        },
        error: (error) => {
          console.error('Erro ao adicionar produto à promoção:', error);
          alert('Erro ao adicionar produto à promoção. Verifique os dados.');
        },
      });
    } else {
      alert('Por favor, preencha todos os campos.');
    }
  }

  resetForm(): void {
    this.promotionData = {
      promotion_name: '',
    };
  }
}
