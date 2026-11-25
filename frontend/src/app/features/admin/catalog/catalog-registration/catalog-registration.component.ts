import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { AdminStateComponent } from '../../../../shared/components/admin-state/admin-state.component';
import { AdminPageHeaderComponent } from '../../../../shared/components/admin-page-header/admin-page-header.component';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute } from '@angular/router';
import { finalize, filter } from 'rxjs';
import { CustomAlertService } from '../../../../core/services/custom-alert.service';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';

import { ProductService } from '../../../../core/services/product.service';

import type { Registration } from '../../../../shared/types/catalog/registration';

@Component({
  selector: 'app-catalog-registration',
  imports: [
    PaginationComponent,
    AdminStateComponent,
    AdminPageHeaderComponent,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
  ],
  templateUrl: './catalog-registration.component.html',
  styleUrl: './catalog-registration.component.scss',
})
export class CatalogRegistrationComponent {
  private readonly products = inject(ProductService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  readonly dialogRef = inject(MatDialogRef, { optional: true });
  private readonly confirm = inject(ConfirmDialogService);
  private readonly alerts = inject(CustomAlertService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly kind =
    (inject(MAT_DIALOG_DATA, { optional: true }) ??
      this.route?.snapshot.data['kind']) === 'brands'
      ? 'brands'
      : 'categories';
  readonly title = this.kind === 'brands' ? 'Marcas' : 'Categorias';
  readonly noun = this.kind === 'brands' ? 'marca' : 'categoria';
  readonly items = signal<Registration[]>([]);
  readonly page = signal(1);
  readonly pageSize = 10;
  readonly currentPage = computed(() =>
    Math.min(
      this.page(),
      Math.max(1, Math.ceil(this.filtered().length / this.pageSize)),
    ),
  );
  readonly paged = computed(() =>
    this.filtered().slice(
      (this.currentPage() - 1) * this.pageSize,
      this.currentPage() * this.pageSize,
    ),
  );
  readonly query = signal('');
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly filtered = computed(() => {
    const term = this.query().trim().toLocaleLowerCase('pt-BR');
    return this.items().filter((item) =>
      item.name.toLocaleLowerCase('pt-BR').includes(term),
    );
  });
  name = '';
  private id: number | null = null;

  constructor() {
    this.load();
  }

  load(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.failed.set(false);
    this.products
      .catalogRegistrations(this.kind)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (items) => this.items.set(items),
        error: () => this.failed.set(true),
      });
  }

  start(item?: Registration): void {
    if (this.saving()) return;
    this.name = item?.name ?? '';
    this.id = item?.id ?? null;
    this.formError.set('');
    this.editing.set(true);
  }

  save(): void {
    const name = this.name.trim().replace(/\s+/g, ' ');
    if (
      !name ||
      Array.from(name).length > 100 ||
      this.saving() ||
      this.loading()
    )
      return;
    this.saving.set(true);
    this.formError.set('');
    const request = this.id
      ? this.products.updateCatalogRegistration(this.kind, this.id, name)
      : this.products.createCatalogRegistration(this.kind, name);
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.editing.set(false);
          this.alerts.success('Cadastro salvo.');
          this.load();
        },
        error: (error) => this.formError.set(this.message(error)),
      });
  }

  remove(item: Registration): void {
    if (item.productCount) return;
    this.confirm
      .open({
        title: 'Excluir ' + this.noun + '?',
        message: item.name,
        variant: 'danger',
        primary: 'Excluir',
        secondary: 'Cancelar',
        execute: () =>
          this.products.removeCatalogRegistration(this.kind, item.id),
        errorMessage: (error) => this.message(error),
      })
      .afterClosed()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter((result) => result === true),
      )
      .subscribe(() => {
        this.alerts.success('Cadastro excluído.');
        this.load();
      });
  }

  private message(error: unknown): string {
    return error instanceof HttpErrorResponse &&
      typeof error.error?.message === 'string'
      ? error.error.message
      : 'Não foi possível concluir a operação.';
  }
}
