import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-shop-by-category',
  imports: [RouterLink],
  templateUrl: './shop-by-category.component.html',
  styleUrl: './shop-by-category.component.css'
})
export class ShopByCategoryComponent {
  @Input() titulo: string = 'Título Padrão';
}
