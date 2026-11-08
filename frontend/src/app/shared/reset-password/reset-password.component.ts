import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { NavigationStart, Router, RouterLink } from '@angular/router';
import { filter, finalize, take, takeUntil } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CustomAlertService } from '../../core/services/custom-alert.service';
import { AuthService } from '../../core/services/auth.service';
import { RegisterValidators } from '../../core/validators/register.validators';
import { ShowPasswordComponent } from '../css/show-password/show-password.component';

type PasswordRequirement =
  | 'length'
  | 'uppercase'
  | 'lowercase'
  | 'number'
  | 'symbol';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ShowPasswordComponent,
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: [
    '../../features/authorization/register/register.component.scss',
    '../forgot-password/forgot-password.component.scss',
    './reset-password.component.css',
  ],
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alerts = inject(CustomAlertService);

  private readonly destroyRef = inject(DestroyRef);

  isLoading = false;
  isValidating = true;
  isInvalid = false;
  isSuccess = false;
  isPasswordVisible = false;
  isConfirmPasswordVisible = false;
  submitError = '';
  private resetToken: string | null = null;

  readonly resetForm = this.fb.nonNullable.group(
    {
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          (control: AbstractControl) => new TextEncoder().encode(control.value ?? '').length > 72 ? { maxlength: true } : null,
          RegisterValidators.strongPassword(),
        ],
      ],
      confirmPassword: ['', Validators.required],
    },
    {
      validators: RegisterValidators.passwordsMatch(
        'newPassword',
        'confirmPassword',
      ),
    },
  );

  ngOnInit(): void {
    this.resetToken = this.authService.getPasswordResetToken();
    if (!this.resetToken) {
      this.isValidating = false;
      this.isInvalid = true;
      this.resetForm.disable();
      return;
    }

    this.authService
      .validateResetToken(this.resetToken)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => (this.isValidating = false)))
      .subscribe({
        error: (error: HttpErrorResponse) => {
          if (error.status === 401 || error.status === 410) this.invalidateFlow();
          else this.submitError = 'Não foi possível confirmar a recuperação. Tente alterar a senha novamente.';
        },
      });
  }

  onSubmit(): void {
    if (this.resetForm.invalid || !this.resetToken || this.isLoading || this.isValidating || this.isSuccess) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.submitError = '';

    this.authService
      .resetPassword(
        this.resetToken,
        this.resetForm.controls.newPassword.value,
      )
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => (this.isLoading = false)))
      .subscribe({
        next: () => {
          this.isSuccess = true;
          this.resetForm.disable();
          this.authService.clearPasswordResetToken();
          this.resetToken = null;
          this.isLoading = false;
          this.showSuccessToast();
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 401 || error.status === 410) {
            this.invalidateFlow();
            return;
          }

          this.submitError = 'Não foi possível alterar a senha. Tente novamente.';
        },
      });
  }

  private showSuccessToast(): void {
    const toast = this.alerts.success(
      'Senha alterada com sucesso!',
      'Redirecionando para o login...',
      { duration: 3000, showProgress: true, showClose: false },
    );
    toast.setInput('recoverySuccess', true);
    toast.instance.elapsed
      .pipe(
        take(1),
        takeUntil(this.router.events.pipe(filter(event => event instanceof NavigationStart))),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (!toast.hostView.destroyed) toast.instance.onClose();
        }),
      )
      .subscribe(() => void this.router.navigate(['/login']));
    // Starts the toast lifetime and its progress together after subscribing.
    toast.changeDetectorRef.detectChanges();
  }

  showError(field: 'newPassword' | 'confirmPassword'): boolean {
    const control = this.resetForm.controls[field];
    return control.invalid && control.touched;
  }

  passwordsMismatch(): boolean {
    const confirmation = this.resetForm.controls.confirmPassword;
    return (
      this.resetForm.hasError('passwordsMismatch') &&
      (confirmation.touched || confirmation.dirty)
    );
  }

  passwordRequirementMet(requirement: PasswordRequirement): boolean {
    const password = this.resetForm.controls.newPassword.value;
    const checks: Record<PasswordRequirement, boolean> = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      symbol: /[?@#$%&]/.test(password),
    };

    return checks[requirement];
  }

  private invalidateFlow(): void {
    this.isInvalid = true;
    this.resetForm.disable();
    this.authService.clearPasswordResetToken();
    this.resetToken = null;
  }
}
