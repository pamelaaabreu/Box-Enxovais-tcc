import { Component, DestroyRef, TemplateRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { AccountService, SavedAddress, contactPhonePattern } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';
import { CatalogLayoutComponent } from '../catalog/components/catalog-layout/catalog-layout.component';

@Component({
  standalone: true,
  imports: [CatalogLayoutComponent, RouterLink, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, NgxMaskDirective],
  providers: [provideNgxMask({ validation: false })],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent {
  private readonly account = inject(AccountService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly addresses = signal<SavedAddress[]>([]);
  readonly email = signal('');
  readonly error = signal('');
  readonly notice = signal('');
  readonly busy = signal(false);
  readonly loaded = signal(false);
  readonly addressesLoaded = signal(false);
  readonly editing = signal(false);
  readonly lookingUp = signal(false);
  private addressId: number | null = null;
  readonly profile = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    phone: ['', Validators.pattern(contactPhonePattern)],
  });
  readonly address = this.fb.group({
    label: ['', [Validators.required, Validators.maxLength(40)]],
    recipient: ['', Validators.required],
    zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}-?\d{3}$/)]],
    street: ['', Validators.required],
    number: ['', Validators.required],
    complement: [''],
    neighborhood: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
  });
  readonly addressFields = [
    { key: 'label', label: 'Identificação' },
    { key: 'recipient', label: 'Destinatário' },
    { key: 'zipCode', label: 'CEP' },
    { key: 'street', label: 'Logradouro' },
    { key: 'number', label: 'Número' },
    { key: 'complement', label: 'Complemento' },
    { key: 'neighborhood', label: 'Bairro' },
    { key: 'city', label: 'Cidade' },
    { key: 'state', label: 'UF' },
  ] as const;

  constructor() {
    this.auth.userChanged.pipe(takeUntilDestroyed()).subscribe(() => void this.router.navigate(['/login']));
    this.account.profile().pipe(takeUntilDestroyed()).subscribe({
      next: profile => {
        this.profile.patchValue(profile);
        this.email.set(profile.email);
        this.loaded.set(true);
      },
      error: () => this.error.set('Não foi possível carregar seu perfil.'),
    });
    this.loadAddresses();
  }

  saveProfile(): void {
    if (!this.loaded() || this.profile.invalid) {
      this.profile.markAllAsTouched();
      return;
    }
    this.run(this.account.updateProfile(this.profile.getRawValue()), () => this.notice.set('Dados atualizados.'));
  }

  editAddress(address?: SavedAddress): void {
    this.addressId = address?.id ?? null;
    this.address.reset();
    if (address) this.address.patchValue(address);
    this.editing.set(true);
  }

  lookupZip(): void {
    const cep = this.address.controls.zipCode.value;
    if (this.address.controls.zipCode.invalid || this.lookingUp()) return;
    const before = this.address.getRawValue();
    this.lookingUp.set(true);
    this.notice.set('');
    this.account.lookupZip(cep.replace('-', '')).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.lookingUp.set(false)),
    ).subscribe({
      next: result => {
        if (!this.editing() || this.address.controls.zipCode.value !== cep) return;
        if (result.erro) {
          this.notice.set('CEP não encontrado. Preencha o endereço manualmente.');
          return;
        }
        const values = { street: result.logradouro, neighborhood: result.bairro, city: result.localidade, state: result.uf };
        for (const key of ['street', 'neighborhood', 'city', 'state'] as const) {
          const control = this.address.controls[key];
          if (values[key] && control.value === before[key]) control.setValue(values[key]);
        }
      },
      error: () => this.notice.set('Não foi possível consultar o CEP. Preencha o endereço manualmente.'),
    });
  }

  saveAddress(): void {
    if (this.address.invalid) {
      this.address.markAllAsTouched();
      return;
    }
    const address = this.address.getRawValue();
    this.run(this.account.saveAddress(this.addressId, { ...address, state: address.state.toUpperCase() }), () => {
      this.editing.set(false);
      this.loadAddresses();
    });
  }

  removeAddress(template: TemplateRef<unknown>, id: number): void {
    this.dialog.open(template, { autoFocus: 'first-tabbable' }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirm => {
        if (confirm === true) this.run(this.account.deleteAddress(id), () => this.loadAddresses());
      });
  }

  makeDefault(id: number): void {
    this.run(this.account.setDefaultAddress(id), () => this.loadAddresses());
  }

  private loadAddresses(): void {
    this.account.addresses().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: addresses => {
        this.addresses.set(addresses);
        this.addressesLoaded.set(true);
      },
      error: () => this.error.set('Não foi possível carregar seus endereços.'),
    });
  }

  private run(request: Observable<unknown>, success: () => void): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: success,
      error: error => this.error.set(error.error?.message || 'Não foi possível salvar a alteração. Tente novamente.'),
    });
  }
}
