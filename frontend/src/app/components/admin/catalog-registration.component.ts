import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute } from '@angular/router';
import { finalize, filter } from 'rxjs';
import { CustomAlertService } from '../../core/services/custom-alert.service';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.service';

import { ProductService } from '../../core/services/product.service';

interface Registration {
  id: number;
  name: string;
  productCount: number;
}

@Component({
  selector: 'app-catalog-registration',
  imports: [FormsModule, MatButtonModule, MatDialogModule],
  template: `
    <section class="registrations" [class.in-dialog]="dialogRef">
      <header><h2>{{ title }}</h2>@if (dialogRef) { <button mat-stroked-button type="button" mat-dialog-close>Fechar</button> }<button mat-flat-button class="primary" type="button" (click)="start()">Nova {{ noun }}</button></header>
      @if (editing()) {
        <form (ngSubmit)="save()" class="editor">
          <label>Nome <input name="name" maxlength="100" required [(ngModel)]="name" [disabled]="saving()" /></label>
          @if (formError()) { <p role="alert">{{ formError() }}</p> }
          <div class="actions">
            <button mat-flat-button class="primary" type="submit" [disabled]="!name.trim() || saving() || loading()">{{ saving() ? 'Salvando…' : 'Salvar' }}</button>
            <button mat-stroked-button type="button" [disabled]="saving()" (click)="editing.set(false)">Cancelar</button>
          </div>
        </form>
      }
      <label>Buscar por nome <input type="search" [ngModel]="query()" (ngModelChange)="query.set($event)" /></label>
      @if (loading()) {
        <p role="status">Carregando {{ title.toLowerCase() }}…</p>
      } @else if (failed()) {
        <div role="alert"><p>Não foi possível carregar os cadastros.</p><button mat-stroked-button type="button" (click)="load()">Tentar novamente</button></div>
      } @else if (filtered().length) {
        <ul>
          @for (item of filtered(); track item.id) {
            <li>
              <div><strong>{{ item.name }}</strong><small>{{ item.productCount }} produto(s) vinculado(s)</small></div>
              <div class="actions">
                <button mat-stroked-button type="button" (click)="start(item)">Editar</button>
                <button mat-stroked-button type="button" [disabled]="item.productCount > 0" (click)="remove(item)">Excluir</button>
              </div>
            </li>
          }
        </ul>
      } @else if (!items().length) {
        <div class="empty"><p>Nenhuma {{ noun }} cadastrada.</p><button mat-stroked-button type="button" (click)="start()">Cadastrar {{ noun }}</button></div>
      } @else {
        <p>Nenhum resultado para a busca.</p>
      }
    </section>
  `,
  styleUrl: './catalog-registration.component.css',
})
export class CatalogRegistrationComponent {
  private readonly http = inject(HttpClient);
  private readonly products = inject(ProductService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  readonly dialogRef = inject(MatDialogRef, { optional: true });
  private readonly confirm = inject(ConfirmDialogService);
  private readonly alerts = inject(CustomAlertService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly kind = (inject(MAT_DIALOG_DATA, { optional: true }) ?? this.route?.snapshot.data['kind']) === 'brands' ? 'brands' : 'categories';
  private readonly url = 'http://localhost:8080/admin/catalog/' + this.kind;
  readonly title = this.kind === 'brands' ? 'Marcas' : 'Categorias';
  readonly noun = this.kind === 'brands' ? 'marca' : 'categoria';
  readonly items = signal<Registration[]>([]);
  readonly query = signal('');
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly filtered = computed(() => {
    const term = this.query().trim().toLocaleLowerCase('pt-BR');
    return this.items().filter(item => item.name.toLocaleLowerCase('pt-BR').includes(term));
  });
  name = '';
  private id: number | null = null;

  constructor() { this.load(); }

  load(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.failed.set(false);
    this.http.get<Registration[]>(this.url).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
      next: items => this.items.set(items),
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
    if (!name || Array.from(name).length > 100 || this.saving() || this.loading()) return;
    this.saving.set(true);
    this.formError.set('');
    const request = this.id ? this.http.patch(this.url + '/' + this.id, { name }) : this.products.createCatalogRegistration(this.kind, name);
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.editing.set(false);
        this.alerts.success('Cadastro salvo.');
        this.load();
      },
      error: error => this.formError.set(this.message(error)),
    });
  }

  remove(item: Registration): void {
    if (item.productCount) return;
    this.confirm.open({
      title: 'Excluir ' + this.noun + '?',
      message: item.name,
      variant: 'danger',
      primary: 'Excluir',
      secondary: 'Cancelar',
      execute: () => this.http.delete(this.url + '/' + item.id),
      errorMessage: error => this.message(error),
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef), filter(result => result === true)).subscribe(() => {
      this.alerts.success('Cadastro excluído.');
      this.load();
    });
  }

  private message(error: unknown): string {
    return error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
      ? error.error.message : 'Não foi possível concluir a operação.';
  }
}