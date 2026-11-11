import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, Subject, of, throwError } from 'rxjs';
import { AccountService } from '../../core/services/account.service';
import { CustomAlertService } from '../../core/services/custom-alert.service';
import { AuthService } from '../../core/services/auth.service';
import { AccountComponent, ageOnDate, birthDateISO } from './account.component';

describe('AccountComponent', () => {
  it('validates calendar dates and counts birthdays without requiring adulthood', () => {
    expect(birthDateISO('29/02/2024', new Date(2025, 2, 1))).toBe('2024-02-29');
    expect(birthDateISO('29/02/2025', new Date(2025, 2, 1))).toBe('');
    expect(birthDateISO('02/03/2025', new Date(2025, 2, 1))).toBe('');
    expect(ageOnDate('16/06/2010', new Date(2025, 5, 15))).toBe(14);
    expect(ageOnDate('16/06/2010', new Date(2025, 5, 16))).toBe(15);
    expect(ageOnDate('16/06/2010', new Date(2025, 5, 17))).toBe(15);
  });

  it('sends a date-only value and uses the profile confirmed by the API', () => {
    const saved = { name: 'Pessoa Teste', email: 'test@example.com', phone: '11912345678',
      nationalId: '', birthDate: '' };
    const updateProfile = jasmine.createSpy('updateProfile').and.returnValue(of({ ...saved, birthDate: '2000-02-29' }));
    TestBed.configureTestingModule({
      imports: [AccountComponent],
      providers: [
        provideRouter([]),
        { provide: AccountService, useValue: { profile: () => of(saved), addresses: () => of([]), updateProfile } },
        { provide: AuthService, useValue: { userChanged: NEVER, updateSavedName: jasmine.createSpy('updateSavedName') } },
        { provide: CustomAlertService, useValue: { success: jasmine.createSpy('success') } },
      ],
    }).overrideComponent(AccountComponent, { set: { template: '' } });
    const component = TestBed.createComponent(AccountComponent).componentInstance;
    component.editProfile();
    component.profile.controls.birthDate.setValue('30/02/2000');
    component.saveProfile();
    expect(updateProfile).not.toHaveBeenCalled();
    component.profile.controls.birthDate.setValue('29/02/2000');
    component.saveProfile();
    expect(updateProfile).toHaveBeenCalledWith(jasmine.objectContaining({ birthDate: '2000-02-29' }));
    expect(component.confirmedProfile()?.birthDate).toBe('2000-02-29');
    expect(component.editingProfile()).toBeFalse();
  });

  it('cancels stale CEPs and preserves manual edits and omitted fields', fakeAsync(() => {
    const first = new Subject<{ logradouro?: string }>();
    const second = new Subject<{ logradouro?: string; bairro?: string; localidade?: string }>();
    const lookupZip = jasmine.createSpy('lookupZip').and.returnValues(first, second);
    const account = {
      profile: () => NEVER,
      addresses: () => of([]),
      lookupZip,
      saveAddress: jasmine.createSpy('saveAddress').and.returnValue(of({ data: { id: 4, isDefault: true } })),
    };
    TestBed.configureTestingModule({
      imports: [AccountComponent],
      providers: [provideRouter([]), { provide: AccountService, useValue: account },
        { provide: AuthService, useValue: { userChanged: NEVER } },
        { provide: CustomAlertService, useValue: { success: jasmine.createSpy('success') } }],
    }).overrideComponent(AccountComponent, { set: { template: '' } });
    const component = TestBed.createComponent(AccountComponent).componentInstance;
    component.editAddress({
      id: 4, isDefault: true, label: 'Casa', recipient: 'Pessoa Teste',
      street: 'Rua antiga', neighborhood: 'Bairro manual', number: '10',
      complement: 'Apto 2', city: 'São Paulo', state: 'SP', zipCode: '01000-000',
    });
    expect(lookupZip).not.toHaveBeenCalled();
    component.address.controls.zipCode.setValue('01001-000');
    tick(300);
    expect(component.lookingUp()).toBeTrue();
    component.address.controls.zipCode.setValue('01002-000');
    expect(first.observed).toBeFalse();
    tick(300);
    component.address.controls.street.setValue('Rua digitada');
    first.next({ logradouro: 'Rua obsoleta' });
    second.next({ logradouro: 'Rua automática', localidade: 'Nova cidade' });
    second.complete();
    expect(component.address.getRawValue()).toEqual(jasmine.objectContaining({
      street: 'Rua digitada', city: 'Nova cidade', neighborhood: 'Bairro manual',
      number: '10', complement: 'Apto 2', zipCode: '01002-000',
    }));
    expect(component.zipFound()).toBeTrue();
    expect(component.lockedPostalFields()).toEqual(['city']);
    component.toggleManualAddress();
    expect(component.lockedPostalFields()).toEqual([]);
    component.address.controls.city.setValue('Cidade manual');
    component.toggleManualAddress();
    expect(component.address.controls.city.value).toBe('Nova cidade');
    component.chooseAddressLabel('Outro');
    component.address.controls.label.setValue('Personalizado');
    component.chooseAddressLabel('Trabalho');
    component.chooseAddressLabel('Outro');
    expect(component.address.controls.label.value).toBe('Personalizado');
    expect(component.lookingUp()).toBeFalse();
    component.saveAddress();
    expect(account.saveAddress).toHaveBeenCalledWith(4, jasmine.objectContaining({ number: '10', complement: 'Apto 2' }));

    component.editAddress();
    lookupZip.and.returnValue(of({ erro: true }));
    component.address.controls.zipCode.setValue('99999-999');
    tick(300);
    expect(component.zipStatus()).toContain('CEP não encontrado');
    lookupZip.and.returnValue(throwError(() => new Error('offline')));
    component.address.controls.zipCode.setValue('99998-999');
    tick(300);
    expect(component.zipStatus()).toContain('Não foi possível consultar');
    expect(component.lookingUp()).toBeFalse();
  }));
});
