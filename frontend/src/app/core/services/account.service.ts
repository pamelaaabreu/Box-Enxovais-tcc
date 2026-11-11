import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, timeout } from 'rxjs';

export interface AccountProfile {
  name: string;
  email: string;
  phone: string;
  nationalId: string;
  birthDate: string;
}

export interface ShippingAddress {
  recipient: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface SavedAddress extends ShippingAddress {
  id: number;
  label: string;
  isDefault: boolean;
}

export const mobilePhonePattern = /^(?:\+55[ .-]*)?(?:\((?:1[1-9]|2[12478]|3[1-578]|4[1-9]|5[1345]|6[1-9]|7[134579]|8[1-9]|9[1-9])\) ?|(?:1[1-9]|2[12478]|3[1-578]|4[1-9]|5[1345]|6[1-9]|7[134579]|8[1-9]|9[1-9]))(?!9{5}-?9{4}$)9\d{4}-?\d{4}$/;

export const contactPhonePattern = /^(?:\+55[ .-]*)?\(?[1-9]\d\)?[ .-]*\d{4,5}[ .-]?\d{4}$/;

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly postalHttp = new HttpClient(inject(HttpBackend));
  private readonly url = 'http://localhost:8080/me';

  profile() {
    return this.http.get<{ data: AccountProfile }>(this.url).pipe(map(response => response.data));
  }

  updateProfile(profile: Partial<Omit<AccountProfile, 'email'>>) {
    return this.http.patch<{ data: AccountProfile }>(this.url, profile).pipe(map(response => response.data));
  }

  addresses() {
    return this.http.get<{ data: SavedAddress[] }>(this.url + '/addresses').pipe(map(response => response.data));
  }

  saveAddress(id: number | null, address: ShippingAddress & { label: string }) {
    const url = this.url + '/addresses';
    return id === null
      ? this.http.post<{ data: SavedAddress }>(url, address)
      : this.http.patch<{ data: SavedAddress }>(url + '/' + id, address);
  }

  deleteAddress(id: number) {
    return this.http.delete(this.url + '/addresses/' + id);
  }

  setDefaultAddress(id: number) {
    return this.http.put(this.url + '/addresses/' + id + '/default', {});
  }

  lookupZip(cep: string) {
    return this.postalHttp.get<{
      erro?: boolean | string;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    }>('https://viacep.com.br/ws/' + cep + '/json/').pipe(timeout(8000));
  }
}
