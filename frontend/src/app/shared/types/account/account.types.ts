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
