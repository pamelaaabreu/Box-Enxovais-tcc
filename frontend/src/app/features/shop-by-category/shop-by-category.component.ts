import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
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
    inject(HttpClient)
      .get<{ name: string; slug: string; imagePath: string }[]>(
        'http://localhost:8080/home/categories',
      )
      .pipe(catchError(() => of([]))),
    { initialValue: [] },
  );
}
