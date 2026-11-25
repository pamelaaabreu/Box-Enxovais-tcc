import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HomeService } from '../../core/services/home.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
@Component({
  selector: 'app-shop-by-category',
  imports: [RouterLink],
  templateUrl: './shop-by-category.component.html',
  styleUrl: './shop-by-category.component.scss',
})
export class ShopByCategoryComponent {
  @Input() titulo = 'Navegue por categorias';
  readonly categories = toSignal(
    inject(HomeService)
      .categories()
      .pipe(catchError(() => of([]))),
    { initialValue: [] },
  );
}
