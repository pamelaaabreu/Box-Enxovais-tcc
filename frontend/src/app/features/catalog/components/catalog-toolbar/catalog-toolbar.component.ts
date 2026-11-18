import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';

@Component({
 selector: 'app-catalog-toolbar',
 standalone: true,
 imports: [MatSelectModule],
 changeDetection: ChangeDetectionStrategy.OnPush,
 template: `
 <div class="toolbar" aria-label="Resultados e ordenação">
  <span class="count" role="status">{{ loading() ? 'Carregando produtos…' : total() + (total() === 1 ? ' produto' : ' produtos') }}</span>
  <div class="toolbar-controls">
   @if (showFilters()) {
    <button class="filter-toggle" type="button" aria-controls="catalog-filters" [attr.aria-expanded]="filtersOpen()" (click)="filtersToggle.emit()">Filtros</button>
   }
   <ng-content />
   <div class="catalog-sort"><span>Ordenar por</span>
    <mat-select aria-label="Ordenar produtos" [panelClass]="['box-form-options', 'catalog-sort-options']" panelWidth="230px" [value]="sort()" [disabled]="disabled()" (selectionChange)="sortChange.emit($event.value)">
     <mat-option value="">Mais relevantes</mat-option>
     <mat-option value="price_asc">Menor preço</mat-option>
     <mat-option value="price_desc">Maior preço</mat-option>
     <mat-option value="name">Nome</mat-option>
     <mat-option value="recent">Mais recentes</mat-option>
    </mat-select>
   </div>
  </div>
 </div>`,
 styles: [`:host{display:block;min-width:0}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:6px 0 14px;color:#3d4836;font:400 13px Montserrat,sans-serif;min-height:44px}.count{min-width:0}.toolbar-controls,.catalog-sort{display:flex;align-items:center;gap:10px;min-width:0}.catalog-sort>span{white-space:nowrap}mat-select{display:flex;align-items:center;width:172px;min-height:44px;box-sizing:border-box;padding:0 12px;border:1px solid #a3aa9a;border-radius:12px;background:#fffdf8;font:inherit}mat-select.mat-focused{border-color:#3d4836;outline:2px solid #667255;outline-offset:2px}.filter-toggle{display:none;min-height:44px;padding:8px 14px;border:1px solid #a3aa9a;border-radius:12px;background:#fffdf8;color:inherit;font:inherit}.filter-toggle:focus-visible{outline:2px solid #667255;outline-offset:2px}@media(max-width:850px){.filter-toggle{display:block}}@media(max-width:540px){.toolbar{align-items:flex-start;flex-direction:column;gap:10px}.toolbar-controls{width:100%;justify-content:space-between;flex-wrap:wrap}.catalog-sort{margin-left:auto;gap:8px}mat-select{width:156px}}`]
})
export class CatalogToolbarComponent {
 readonly showFilters = input(false);
 readonly filtersOpen = input(false);
 readonly filtersToggle = output<void>();
 readonly total = input(0);
 readonly sort = input('');
 readonly loading = input(false);
 readonly disabled = input(false);
 readonly sortChange = output<string>();
}
