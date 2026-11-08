import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { FavoritesService } from '../../core/services/favorites.service';

@Component({
  selector: 'app-favorite-button',
  standalone: true,
  templateUrl: './favorite-button.component.html',
  styleUrl: './favorite-button.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoriteButtonComponent {
  readonly favorites = inject(FavoritesService);
  readonly productId = input.required<number>();
  readonly productName = input.required<string>();

  busy(): boolean {
    return (
      this.favorites.pending().has(this.productId()) ||
      (this.favorites.authenticated() && this.favorites.loading())
    );
  }

  disabled(): boolean {
    return (
      this.favorites.authenticated() &&
      (!this.favorites.synchronized() ||
        this.favorites.pending().has(this.productId()))
    );
  }

  message(): string {
    return (
      this.favorites.errors()[this.productId()] || this.favorites.syncError()
    );
  }

  toggle(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.favorites.toggle(this.productId());
  }
  
  retry(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.favorites.synchronize();
  }
}
