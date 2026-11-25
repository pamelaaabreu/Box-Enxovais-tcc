import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-catalog-toolbar',
  standalone: true,
  imports: [MatSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalog-toolbar.component.html',
  styleUrl: './catalog-toolbar.component.scss',
})
export class CatalogToolbarComponent {
  readonly showFilters = input(false);
  readonly filtersOpen = input(false);

  // Comunica a abertura ou fechamento dos filtros.
  readonly filtersToggle = output<void>();

  readonly total = input(0);
  readonly sort = input('');
  readonly loading = input(false);
  readonly disabled = input(false);

  readonly sortOptions = input([
    { value: '', label: 'Mais relevantes' },
    { value: 'price_asc', label: 'Menor preço' },
    { value: 'price_desc', label: 'Maior preço' },
    { value: 'name', label: 'Nome' },
    { value: 'recent', label: 'Mais recentes' },
  ]);

  // Comunica uma alteração na ordenação.
  readonly sortChange = output<string>();
}
