import { HttpErrorResponse } from '@angular/common/http';

import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  OnDestroy,
  QueryList,
  ViewChildren,
  inject,
} from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/services/auth.service';
import { CustomAlertService } from '../../core/services/custom-alert.service';

type RecoveryStep = 'email' | 'otp';

@Component({
  selector: 'app-forgot-password',
  standalone: true,

  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],

  templateUrl: './forgot-password.component.html',

  styleUrls: [
    '../../features/authorization/register/register.component.scss',
    './forgot-password.component.scss',
  ],
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly customAlert = inject(CustomAlertService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  isResending = false;

  step: RecoveryStep = 'email';

  isLoading = false;
  resendSeconds = 0;
  otpError = '';

  readonly otpLength = 8;

  @ViewChildren('otpInput')
  private otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  private resendTimer?: ReturnType<typeof setInterval>;

  readonly otpForm = this.fb.nonNullable.array(
    Array.from({ length: this.otpLength }, () =>
      this.fb.nonNullable.control('', [
        Validators.required,
        Validators.pattern(/^[a-z0-9]$/i),
      ]),
    ),
  );

  readonly forgotForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],

    code: [
      { value: '', disabled: true },
      [Validators.required, Validators.pattern(/^[a-z0-9]{8}$/i)],
    ],
  });

  ngOnInit(): void {
    if (this.route.snapshot.data['recoveryStep'] !== 'otp') {
      return;
    }

    const email = this.authService.getPasswordResetEmail();

    if (!email) {
      this.router.navigate(['/forgot-password']);
      return;
    }

    this.forgotForm.controls.email.setValue(email);
    this.prepareOtpStep();
  }

  onSubmit(): void {
    if (this.isLoading) {
      return;
    }

    if (this.step === 'email') {
      this.sendCode();
      return;
    }

    this.confirmCode();
  }

  resendCode(): void {
    if (this.resendSeconds > 0 || this.isLoading) {
      return;
    }

    this.requestCode(true);
  }

  backToEmail(): void {
    if (this.isLoading) {
      return;
    }

    this.clearResendTimer();

    this.authService.clearPasswordResetEmail();

    this.step = 'email';
    this.otpError = '';

    this.otpForm.reset();
    this.forgotForm.controls.code.reset();
    this.forgotForm.controls.code.disable();

    this.router.navigate(['/forgot-password']);
  }

  onOtpInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;

    const character = input.value
      .replace(/[^a-z0-9]/gi, '')
      .slice(-1)
      .toUpperCase();

    input.value = character;

    this.otpForm.at(index).setValue(character);
    this.otpError = '';

    if (character && index < this.otpForm.length - 1) {
      this.focusOtp(index + 1);
    }
  }

  onOtpKeydown(index: number, event: KeyboardEvent): void {
    if (
      event.key === 'Backspace' &&
      !this.otpForm.at(index).value &&
      index > 0
    ) {
      event.preventDefault();
      this.focusOtp(index - 1);
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();

    if (this.isLoading) {
      return;
    }

    const characters =
      event.clipboardData
        ?.getData('text')
        .replace(/[^a-z0-9]/gi, '')
        .slice(0, this.otpLength)
        .toUpperCase() ?? '';

    characters.split('').forEach((character, index) => {
      this.otpForm.at(index).setValue(character);
    });

    for (let index = characters.length; index < this.otpLength; index += 1) {
      this.otpForm.at(index).setValue('');
    }

    this.otpError = '';

    this.focusOtp(Math.min(characters.length, this.otpLength - 1));
  }

  get maskedEmail(): string {
    const email = this.forgotForm.controls.email.value;

    const [localPart, domain] = email.split('@');

    if (!localPart || !domain) {
      return email;
    }

    const visible = localPart.slice(0, Math.min(2, localPart.length));

    return `${visible}***@${domain}`;
  }

  ngOnDestroy(): void {
    this.clearResendTimer();
  }

  showError(field: 'email' | 'code'): boolean {
    const control = this.forgotForm.controls[field];

    return control.invalid && control.touched;
  }

  private sendCode(): void {
    const emailControl = this.forgotForm.controls.email;

    if (emailControl.invalid) {
      emailControl.markAsTouched();
      return;
    }

    this.authService.clearPasswordResetToken();

    this.requestCode(false);
  }

  private confirmCode(): void {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      this.otpError = 'Informe os 8 caracteres do código.';
      return;
    }

    const code = this.otpForm.getRawValue().join('');

    this.isLoading = true;
    this.otpError = '';

    this.authService
      .validateResetCode(this.forgotForm.controls.email.value, code)
      .pipe(
        takeUntilDestroyed(this.destroyRef),

        finalize(() => {
          this.isLoading = false;
          this.isResending = false;
        }),
      )
      .subscribe({
        next: (response) => {
          const resetToken = response.data?.resetToken;

          if (!resetToken) {
            this.otpError = 'Não foi possível autorizar a redefinição.';
            return;
          }

          this.authService.savePasswordResetToken(resetToken);
          this.authService.clearPasswordResetEmail();

          this.router.navigate(['/reset-password']);
        },

        error: (error: HttpErrorResponse) => {
          this.otpError =
            error.status === 410
              ? 'Este código expirou. Solicite um novo código.'
              : error.status === 400
                ? 'Código inválido. Confira ou solicite um novo código.'
                : error.status === 0
                  ? 'Sem conexão. Verifique sua internet e tente novamente.'
                  : 'Não foi possível validar o código. Tente novamente.';
        },
      });
  }

  private requestCode(isResend: boolean): void {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.isResending = isResend;

    const email = this.forgotForm.controls.email.value.trim().toLowerCase();

    this.forgotForm.controls.email.setValue(email);

    this.authService
      .requestPasswordReset(email)
      .pipe(
        takeUntilDestroyed(this.destroyRef),

        finalize(() => {
          this.isLoading = false;
          this.isResending = false;
        }),
      )
      .subscribe({
        next: () => {
          this.prepareOtpStep();

          if (!isResend) {
            this.authService.savePasswordResetEmail(email);

            this.router.navigate(['/verify-code']);
          }

          this.customAlert.success(
            isResend ? 'Código reenviado' : 'Código enviado',

            isResend
              ? 'Um novo código foi enviado para o seu e-mail.'
              : 'Código de verificação enviado para o seu e-mail.',
          );
        },

        error: (error: HttpErrorResponse) => {
          if (error.status === 429 && isResend) {
            this.startResendCountdown();
          }

          this.step = isResend ? 'otp' : 'email';

          this.otpError = isResend ? 'Não foi possível reenviar o código.' : '';

          this.customAlert.error(
            'Não foi possível enviar o código',

            error.status === 0
              ? 'Sem conexão. Verifique sua internet e tente novamente.'
              : error.status === 429
                ? 'Aguarde 30 segundos antes de tentar novamente.'
                : error.status === 404
                  ? 'Confira o e-mail informado e tente novamente.'
                  : 'O envio falhou. Tente novamente em instantes.',
          );
        },
      });
  }

  private prepareOtpStep(): void {
    this.forgotForm.controls.code.enable();
    this.forgotForm.controls.code.reset();

    this.otpForm.reset();
    this.otpError = '';

    this.step = 'otp';

    this.startResendCountdown();

    setTimeout(() => this.focusOtp(0));
  }

  private focusOtp(index: number): void {
    this.otpInputs?.get(index)?.nativeElement.focus();
  }

  private startResendCountdown(): void {
    this.clearResendTimer();

    this.resendSeconds = 30;

    this.resendTimer = setInterval(() => {
      this.resendSeconds -= 1;

      if (this.resendSeconds <= 0) {
        this.clearResendTimer();
      }
    }, 1000);
  }

  private clearResendTimer(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = undefined;
    }
  }
}
