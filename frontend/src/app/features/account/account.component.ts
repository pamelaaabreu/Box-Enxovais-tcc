import { Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.service';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';
import { MatIconModule } from '@angular/material/icon';
import { CustomAlertService } from '../../core/services/custom-alert.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { EMPTY, Observable, Subject, TimeoutError, catchError, finalize, of, switchMap, takeUntil, tap, timer } from 'rxjs';
import { AccountProfile, AccountService, SavedAddress, mobilePhonePattern } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';
import { CatalogLayoutComponent } from '../catalog/components/catalog-layout/catalog-layout.component';

@Component({
  standalone: true,
  imports: [CatalogLayoutComponent, RouterLink, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatProgressSpinnerModule, NgxMaskDirective, NgxMaskPipe],
  providers: [provideNgxMask({ validation: false })],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent {
  private readonly account = inject(AccountService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly addresses = signal<SavedAddress[]>([]);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly alerts = inject(CustomAlertService);
  readonly tabs = [
    { id: 'dados', label: 'Meus dados' },
    { id: 'enderecos', label: 'Meus endereços' },
    { id: 'seguranca', label: 'Segurança da conta' },
  ] as const;
  readonly activeTab = signal('dados');
  private savedProfile = '';
  get profileAge(): number | null {
    return ageOnDate(this.profile.controls.birthDate.value);
  }

  readonly confirmedProfile = signal<AccountProfile | null>(null);
  readonly editingProfile = signal(false);
  get hasProfileChanges(): boolean {
    return JSON.stringify(this.profile.getRawValue()) !== this.savedProfile;
  }

  readonly savedName = signal('');
  get initials(): string {
    const names = this.savedName().trim().split(/\s+/).filter(Boolean);
    return [names[0], names.length > 1 ? names.at(-1) : undefined]
      .filter(Boolean).map(name => name![0]).join('').toLocaleUpperCase('pt-BR');
  }

  private savedAddressDraft = '';

  selectTab(id: string): void {
    if (this.activeTab() === id || this.busy()) return;
    const showTab = () => {
      this.activeTab.set(id);
      const tabs = this.host.nativeElement.querySelector('.account-tabs');
      if (!tabs) return;
      const headerHeight = parseFloat(getComputedStyle(tabs).getPropertyValue('--catalog-header-height')) || 0;
      if (tabs.getBoundingClientRect().top < headerHeight) tabs.scrollIntoView({ block: 'start' });
    };
    if (this.editingProfile() && this.hasProfileChanges) {
      this.confirmDiscard(() => {
        this.cancelProfileEdit();
        showTab();
      });
    } else {
      showTab();
    }
  }

  moveTabFocus(event: KeyboardEvent, index: number): void {
    const last = this.tabs.length - 1;
    const target = {
      ArrowLeft: index === 0 ? last : index - 1,
      ArrowRight: index === last ? 0 : index + 1,
      Home: 0,
      End: last,
    }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    this.host.nativeElement.querySelector<HTMLButtonElement>('#tab-' + this.tabs[target].id)?.focus();
  }

  private confirmDiscard(discard: () => void, address = false): void {
    this.dialog.open({
      title: address ? 'Sair sem salvar?' : 'Descartar alterações?',
      message: address
        ? 'Você alterou este endereço e ainda não salvou. Se sair agora, as alterações serão perdidas.'
        : 'Você alterou seus dados e ainda não salvou. Se sair agora, as alterações serão perdidas.',
      variant: 'warning',
      primary: 'Continuar editando',
      secondary: address ? 'Sair sem salvar' : 'Descartar alterações',
      confirmAction: 'secondary',
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmed => { if (confirmed === true) discard(); });
  }

  readonly email = signal('');
  readonly error = signal('');
  readonly notice = signal('');
  readonly busy = signal(false);
  readonly loaded = signal(false);
  readonly addressesLoaded = signal(false);
  readonly editing = signal(false);
  readonly lookingUp = signal(false);
  readonly zipStatus = signal('');
  readonly zipFound = signal(false);
  readonly addressLabels = ['Casa', 'Trabalho', 'Outro'] as const;
  readonly labelChoice = signal<(typeof this.addressLabels)[number]>('Casa');
  readonly customNameConfirmed = signal(false);

  confirmAddressName(): void {
    const name = this.address.controls.label;
    if (this.labelChoice() === 'Outro' && name.valid && name.value.trim()) {
      this.customNameConfirmed.set(true);
    }
  }

  readonly defaultAddress = this.fb.control(false);
  readonly manualAddress = signal(false);
  readonly lockedPostalFields = signal<readonly string[]>([]);
  private postalValues: Partial<Record<(typeof this.postalFields)[number], string>> = {};
  private readonly pendingPostalEdits = new Set<string>();
  private customLabel = '';
  get isEditingAddress(): boolean { return this.addressId !== null; }
  get canChooseDefault(): boolean {
    return !!this.addresses().length && !this.addresses().some(item => item.id === this.addressId && item.isDefault);
  }
  private readonly cancelZipLookup = new Subject<void>();
  private readonly postalFields = ['street', 'neighborhood', 'city', 'state'] as const;
  private readonly postalRevisions = { street: 0, neighborhood: 0, city: 0, state: 0 };
  private addressId: number | null = null;
  readonly profile = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    phone: ['', [Validators.required, Validators.pattern(mobilePhonePattern)]],
    nationalId: ['', (control: AbstractControl<string>) => cpfValid(control.value) ? null : { cpf: true }],
    birthDate: ['', (control: AbstractControl<string>) => !control.value || birthDateISO(control.value) ? null : { birthDate: true }],
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
    { key: 'recipient', label: 'Destinatário', error: 'Informe o nome do destinatário.' },
    { key: 'zipCode', label: 'CEP', error: 'Informe um CEP com 8 dígitos.' },
    { key: 'street', label: 'Logradouro', error: 'Informe o logradouro.' },
    { key: 'number', label: 'Número', error: 'Informe o número do endereço.' },
    { key: 'complement', label: 'Complemento', error: '' },
    { key: 'neighborhood', label: 'Bairro', error: 'Informe o bairro.' },
    { key: 'city', label: 'Cidade', error: 'Informe a cidade.' },
    { key: 'state', label: 'UF', error: 'Informe uma UF com duas letras.' },
  ] as const;

  constructor() {
    this.address.controls.label.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.customNameConfirmed.set(false));
    for (const key of this.postalFields) {
      this.address.controls[key].valueChanges.pipe(takeUntilDestroyed())
        .subscribe(() => this.postalRevisions[key]++);
    }
    this.address.controls.zipCode.valueChanges.pipe(
      switchMap(value => this.lookupZip(value)),
      takeUntilDestroyed(),
    ).subscribe();
    this.auth.userChanged.pipe(takeUntilDestroyed()).subscribe(() => void this.router.navigate(['/login']));
    this.account.profile().pipe(takeUntil(this.auth.userChanged), takeUntilDestroyed()).subscribe({
      next: profile => {
        if (typeof profile?.name !== 'string' || !profile.name.trim()) {
          this.error.set('Não foi possível carregar o nome completo do seu perfil.');
          return;
        }
        this.applyProfile(profile);
        this.loaded.set(true);
      },
      error: () => this.error.set('Não foi possível carregar seu perfil.'),
    });
    this.loadAddresses();
  }

  private applyProfile(profile: AccountProfile): void {
    this.confirmedProfile.set(profile);
    this.restoreProfile(profile);
    this.email.set(profile.email);
    this.savedName.set(profile.name);
    this.auth.updateSavedName(profile.name);
  }

  private restoreProfile(profile: AccountProfile): void {
    this.profile.reset({
      name: profile.name,
      phone: mobilePhonePattern.test(profile.phone) ? profile.phone.replace(/[^0-9]/g, '').slice(-11) : '',
      nationalId: profile.nationalId ?? '',
      birthDate: profile.birthDate?.split('-').reverse().join('/') ?? '',
    });
    this.savedProfile = JSON.stringify(this.profile.getRawValue());
  }

  editProfile(): void {
    if (!this.loaded() || this.busy()) return;
    this.error.set('');
    this.editingProfile.set(true);
  }

  cancelProfileEdit(): void {
    const confirmed = this.confirmedProfile();
    if (!confirmed || !this.editingProfile() || this.busy()) return;
    this.restoreProfile(confirmed);
    this.error.set('');
    this.editingProfile.set(false);
  }

  formatProfilePhone(value: string, localDigits: number): string {
    const digits = value?.replace(/[^0-9]/g, '').slice(-localDigits);
    return digits?.length === localDigits
      ? '(' + digits.slice(0, 2) + ') ' + digits.slice(2, -4) + '-' + digits.slice(-4)
      : value;
  }

  saveProfile(): void {
    if (!this.editingProfile()) return;
    if (!this.loaded() || this.profile.invalid) {
      this.profile.markAllAsTouched();
      return;
    }
    if (!this.hasProfileChanges || this.busy()) return;
    const submitted = this.profile.getRawValue();
    const { birthDate, ...profile } = submitted;
    const request = this.account.updateProfile({ ...profile, nationalId: profile.nationalId.replace(/[.-]/g, ''), birthDate: birthDateISO(birthDate) }).pipe(
      takeUntil(this.auth.userChanged),
      tap(saved => {
        this.applyProfile(saved);
        this.editingProfile.set(false);
      }),
    );
    this.run(request, () => {
      this.alerts.success('Dados atualizados.');
    }, true);
  }

  editAddress(address?: SavedAddress): void {
    this.customNameConfirmed.set(false);
    this.cancelZipLookup.next();
    this.zipStatus.set('');
    this.zipFound.set(false);
    this.postalValues = {};
    this.pendingPostalEdits.clear();
    this.manualAddress.set(false);
    this.lockedPostalFields.set([]);
    this.addressId = address?.id ?? null;
    const label = address?.label ?? 'Casa';
    const choice = label === 'Casa' || label === 'Trabalho' ? label : 'Outro';
    this.customLabel = choice === 'Outro' ? label : '';
    this.labelChoice.set(choice);
    this.defaultAddress.reset({ value: address?.isDefault ?? this.addresses().length === 0, disabled: !this.canChooseDefault });
    this.address.reset({ ...address, label }, { emitEvent: false });
    this.savedAddressDraft = this.addressDraft();
    this.editing.set(true);
  }

  chooseAddressLabel(choice: (typeof this.addressLabels)[number]): void {
    if (this.labelChoice() === 'Outro') this.customLabel = this.address.controls.label.value;
    this.labelChoice.set(choice);
    this.address.controls.label.reset(choice === 'Outro' ? this.customLabel : choice);
  }

  postalDifference(key: string): string | undefined {
    const field = this.postalFields.find(item => item === key);
    if (!field || !this.manualAddress()) return undefined;
    const original = this.postalValues[field];
    return original !== this.address.controls[field].value ? original : undefined;
  }

  get automaticAddressNotice(): string {
    const fields = this.addressFields
      .filter(field => this.lockedPostalFields().includes(field.key))
      .map(field => field.key === 'state' ? 'UF' : field.label.toLowerCase());
    const names = new Intl.ListFormat('pt-BR').format(fields);
    return `Preenchido pelo CEP: ${names}. Número e complemento são com você.`;
  }

  toggleManualAddress(): void {
    if (!this.manualAddress()) {
      this.manualAddress.set(true);
      this.lockedPostalFields.set([]);
      return;
    }
    const locked: string[] = [];
    for (const key of this.postalFields) {
      const value = this.postalValues[key];
      if (!value) continue;
      this.address.controls[key].setValue(value);
      locked.push(key);
    }
    this.lockedPostalFields.set(locked);
    this.manualAddress.set(false);
  }

  private addressDraft(): string {
    return JSON.stringify([this.address.getRawValue(), this.defaultAddress.value]);
  }

  cancelAddressEdit(): void {
    if (this.busy()) return;
    if (this.savedAddressDraft !== this.addressDraft()) {
      this.confirmDiscard(() => this.closeAddressEditor(), true);
    } else {
      this.closeAddressEditor();
    }
  }

  closeAddressEditor(): void {
    this.cancelZipLookup.next();
    this.editing.set(false);
  }

  private lookupZip(value: string): Observable<unknown> {
    for (const key of this.postalFields) if (this.postalDifference(key)) this.pendingPostalEdits.add(key);
    const edited = this.postalFields.filter(key => this.pendingPostalEdits.has(key));
    for (const key of this.postalFields) {
      const control = this.address.controls[key];
      if (this.postalValues[key] && control.value === this.postalValues[key]) control.reset();
    }
    this.postalValues = {};
    this.lockedPostalFields.set([]);
    this.manualAddress.set(false);
    this.zipFound.set(false);
    this.zipStatus.set('');
    if (!this.editing() || this.address.controls.zipCode.invalid) return EMPTY;

    const revisions = { ...this.postalRevisions };
    this.lookingUp.set(true);
    return timer(300).pipe(
      switchMap(() => this.account.lookupZip(value.replace('-', ''))),
      switchMap(result => {
        if (result.erro) {
          this.zipStatus.set('CEP não encontrado. Preencha o endereço manualmente.');
          return EMPTY;
        }
        const values = { street: result.logradouro, neighborhood: result.bairro, city: result.localidade, state: result.uf };
        for (const key of this.postalFields) {
          const text = values[key]?.trim();
          if (!text || text.length > 200 || (key === 'state' && !/^[A-Z]{2}$/.test(text))) continue;
          this.postalValues[key] = text;
        }
        const found = Object.keys(this.postalValues).length > 0;
        this.zipFound.set(found);
        this.zipStatus.set(found ? 'CEP encontrado.' : 'Preencha o endereço manualmente.');
        const conflict = edited.some(key => !!this.postalValues[key] && this.postalValues[key] !== this.address.controls[key].value);
        if (!conflict) return of(false);
        const dialog = this.dialog.open({
          title: 'Aplicar os dados do novo CEP?',
          message: 'Há campos editados manualmente. Você pode manter suas alterações ou aplicar os dados retornados pelo novo CEP.',
          variant: 'info',
          primary: 'Aplicar dados do CEP',
          secondary: 'Manter alterações',
        });
        return dialog.afterClosed().pipe(finalize(() => dialog.close()));
      }),
      tap(overwrite => {
        const locked: string[] = [];
        for (const key of this.postalFields) {
          const text = this.postalValues[key];
          if (!text || this.postalRevisions[key] !== revisions[key] || (edited.includes(key) && !overwrite)) continue;
          this.address.controls[key].setValue(text);
          locked.push(key);
          this.pendingPostalEdits.delete(key);
        }
        this.lockedPostalFields.set(locked);
        this.manualAddress.set(!locked.length && this.zipFound() && edited.length > 0);
      }),
      catchError(error => {
        this.zipStatus.set(error instanceof TimeoutError
          ? 'A consulta demorou demais. Preencha o endereço manualmente.'
          : 'Não foi possível consultar o CEP. Preencha o endereço manualmente.');
        return EMPTY;
      }),
      takeUntil(this.cancelZipLookup),
      finalize(() => this.lookingUp.set(false)),
    );
  }

  saveAddress(): void {
    if (this.lookingUp() || this.busy()) return;
    if (this.address.invalid) {
      this.address.markAllAsTouched();
      return;
    }
    const address = this.address.getRawValue();
    const makeDefault = this.defaultAddress.value;
    let defaultSaved = true;
    const request = this.account.saveAddress(this.addressId, { ...address, zipCode: address.zipCode.replace(/-/g, ''), state: address.state.toUpperCase() }).pipe(
      switchMap(({ data }) => {
        if (!makeDefault || data?.isDefault) return of(true);
        return this.account.setDefaultAddress(data.id).pipe(
          switchMap(() => of(true)),
          catchError(() => of(false)),
        );
      }),
      tap(result => { defaultSaved = result; }),
    );
    this.run(request, () => {
      this.closeAddressEditor();
      this.loadAddresses();
      if (defaultSaved) this.alerts.success('Endereço salvo', 'Ele já está disponível para usar no checkout.');
      else this.notice.set('Endereço salvo. Não foi possível defini-lo como padrão. Tente pela lista.');
    });
  }

  readonly settingDefaultId = signal<number | null>(null);
  removeAddress(address: SavedAddress): void {
    if (this.busy()) return;
    const street = address.street + ', ' + address.number;
    const details = [
      address.complement ? street + ' — ' + address.complement : street,
      address.city + ' / ' + address.state,
    ];
    if (address.isDefault) {
      details.push('Este é seu endereço padrão. Se houver outros endereços, o mais antigo será definido como padrão.');
    }
    this.dialog.open({
      title: `Excluir o endereço "${address.label}"?`,
      message: 'Tem certeza de que deseja excluir este endereço? Essa ação não poderá ser desfeita.',
      details,
      variant: 'danger',
      primary: 'Excluir endereço',
      secondary: 'Manter endereço',
      disableClose: true,
      execute: () => this.account.deleteAddress(address.id),
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmed => {
      if (confirmed !== true) return;
      this.addresses.update(addresses => addresses.filter(item => item.id !== address.id));
      this.loadAddresses();
      this.alerts.success('Endereço excluído com sucesso!');
    });
  }

  makeDefault(id: number): void {
    if (this.busy()) return;
    this.settingDefaultId.set(id);
    this.run(this.account.setDefaultAddress(id).pipe(
      switchMap(() => this.account.addresses().pipe(catchError(() => {
        this.notice.set('Endereço padrão atualizado. Não foi possível recarregar a lista.');
        return of(this.addresses().map(address => ({ ...address, isDefault: address.id === id })));
      }))),
      tap(addresses => this.addresses.set(addresses)),
      finalize(() => this.settingDefaultId.set(null)),
    ), () => this.alerts.success('Endereço padrão atualizado!'), true);
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

  private run(request: Observable<unknown>, success: () => void, toastError = false): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: success,
      error: error => {
        const message = error.error?.message || 'Não foi possível salvar a alteração. Tente novamente.';
        this.error.set(message);
        if (toastError) this.alerts.error(message);
      },
    });
  }
}

function cpfValid(value: string): boolean {
  if (!value) return true;
  const digits = value.replace(/[.-]/g, '');
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  return [9, 10].every(length => {
    const sum = [...digits.slice(0, length)].reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    return sum * 10 % 11 % 10 === Number(digits[length]);
  });
}

export function birthDateISO(value: string, today = new Date()): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return '';
  const [, day, month, year] = match;
  const iso = year + '-' + month + '-' + day;
  const date = new Date(iso + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return '';
  const localISO = (date: Date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(part => String(part).padStart(2, '0')).join('-');
  const upper = localISO(today);
  const lower = new Date(today);
  lower.setFullYear(today.getFullYear() - 130);
  return iso >= localISO(lower) && iso <= upper ? iso : '';
}

export function ageOnDate(value: string, today = new Date()): number | null {
  if (!birthDateISO(value, today)) return null;
  const [day, month, year] = value.split('/').map(Number);
  const beforeBirthday = today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day);
  return today.getFullYear() - year - Number(beforeBirthday);
}
