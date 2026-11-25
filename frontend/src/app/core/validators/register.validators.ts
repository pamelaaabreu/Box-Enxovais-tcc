import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

export class RegisterValidators {

  // Valida o nome completo.
  static fullName(): ValidatorFn {

    return (control: AbstractControl): ValidationErrors | null => {

      const name = String(control.value ?? '').trim();
      const parts = name.split(/\s+/).filter(Boolean);

      return parts.length >= 2 &&
        parts.every((part) => part.length >= 2)
          ? null
          : { fullName: true };
    };
  }

  // Valida os requisitos de segurança da senha.
  static strongPassword(): ValidatorFn {

    return (control: AbstractControl): ValidationErrors | null => {

      const password = String(control.value ?? '');

      if (!password) {
        return null;
      }

      const isStrong =
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password) &&
        /[?@#$%&]/.test(password);

      return isStrong
        ? null
        : { weakPassword: true };
    };
  }

  // Compara os campos de senha e confirmação.
  static passwordsMatch(
    passwordField = 'password',
    confirmationField = 'confirmPassword',
  ): ValidatorFn {

    return (control: AbstractControl): ValidationErrors | null => {

      const password = control.get(passwordField)?.value;
      const confirmation = control.get(confirmationField)?.value;

      if (!password || !confirmation) {
        return null;
      }

      return password === confirmation
        ? null
        : { passwordsMismatch: true };
    };
  }
}