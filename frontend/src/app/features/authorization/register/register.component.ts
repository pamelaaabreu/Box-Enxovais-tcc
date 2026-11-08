import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DOCUMENT } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  LoginCredentials,
  RegisterPayload,
} from '../../../core/interfaces/auth.interface';
import { AuthService } from '../../../core/services/auth.service';
import { CustomAlertService } from '../../../core/services/custom-alert.service';
import { RegisterValidators } from '../../../core/validators/register.validators';
import { ShowPasswordComponent } from '../../../shared/css/show-password/show-password.component';

type PasswordRequirement =
  | 'length'
  | 'uppercase'
  | 'lowercase'
  | 'number'
  | 'symbol';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTabsModule,
    ShowPasswordComponent,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class AuthComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly customAlertService = inject(CustomAlertService);

  isPasswordVisible = false;
  isConfirmPasswordVisible = false;
  isLoginPasswordVisible = false;
  isLoading = false;
  readonly isInitialLoading = signal(true);
  readonly videoEnabled = signal(false);
  readonly videoFailed = signal(false);
  private readonly welcomeVideo =
    viewChild<ElementRef<HTMLVideoElement>>('welcomeVideo');

  selectedTab = 0;

  readonly registerForm = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, RegisterValidators.fullName()]],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          (control: AbstractControl) => new TextEncoder().encode(control.value ?? "").length > 72 ? { maxlength: true } : null,
          RegisterValidators.strongPassword(),
        ],
      ],
      confirmPassword: ['', Validators.required],
      terms: [false, Validators.requiredTrue],
    },
    {
      validators: RegisterValidators.passwordsMatch(),
    },
  );

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    this.selectedTab = this.route.snapshot.data['selectedTab'] === 1 ? 1 : 0;
    this.route.data.pipe(takeUntilDestroyed()).subscribe((data) => {
      this.selectedTab = data['selectedTab'] === 1 ? 1 : 0;
    });
    const document = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);
    let destroyed = false;
    destroyRef.onDestroy(() => {
      destroyed = true;
    });
    afterNextRender(() => {
      const preference = document.defaultView?.matchMedia(
        '(prefers-reduced-motion: reduce), (max-width: 700px)',
      );
      if (preference) {
        const updateVideo = () => {
          if (preference.matches) this.welcomeVideo()?.nativeElement.pause();
          this.videoEnabled.set(!preference.matches);
        };
        updateVideo();
        preference.addEventListener('change', updateVideo);
        destroyRef.onDestroy(() =>
          preference.removeEventListener('change', updateVideo),
        );
      }
      // Reveal the existing layout once its initial render and fonts are ready.
      const ready = () => {
        if (!destroyed) this.isInitialLoading.set(false);
      };
      void document.fonts.ready.then(ready, ready);
    });
  }

  get isRegisterTab(): boolean {
    return this.selectedTab === 1;
  }

  onAuthTabChange(index: number): void {
    if (this.isLoading || index === this.selectedTab) {
      return;
    }

    this.selectedTab = index;

    const destination = index === 1 ? '/register' : '/login';
    void this.router.navigate([destination]);
  }

  onSubmit(): void {
    if (this.isRegisterTab) {
      this.submitRegister();
      return;
    }

    this.submitLogin();
  }

  submitRegister(): void {
    if (this.isLoading) {
      return;
    }

    this.registerForm.markAllAsTouched();
    this.registerForm.updateValueAndValidity();

    if (this.registerForm.invalid) {
      return;
    }

    const { confirmPassword: _confirmPassword, ...formValue } =
      this.registerForm.getRawValue();

    const payload: RegisterPayload = formValue;

    this.isLoading = true;
    this.customAlertService.loading('Criando sua conta...');

    this.authService
      .register(payload)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.customAlertService.hideLoading();
        }),
      )
      .subscribe({
        next: async () => {
          await this.customAlertService.success(
            'Cadastro concluído!',
            'Sua conta foi criada com sucesso.',
          );

          await this.router.navigate(['/login']);
        },
        error: (error: HttpErrorResponse) => {
          const errorMessage = this.getErrorMessage(error);

          if (errorMessage === 'email_duplicado') {
            this.registerForm.controls.email.setErrors({ emailDuplicate: true });
            return;
          }

          if (error.status === 400) {
            const field = errorMessage.startsWith('Nome') || errorMessage === 'Informe seu nome e sobrenome' ? 'name'
              : errorMessage.startsWith('Email') ? 'email'
              : errorMessage.startsWith('Senha') || errorMessage.startsWith('A senha') ? 'password'
              : errorMessage === 'É necessário aceitar os termos de uso' ? 'terms' : null;
            if (field) {
              this.registerForm.controls[field].setErrors({ server: true });
              return;
            }
          }
          this.customAlertService.error('Erro no cadastro', errorMessage);
        },
      });
  }

  submitLogin(): void {
    if (this.isLoading) {
      return;
    }

    this.loginForm.markAllAsTouched();
    this.loginForm.updateValueAndValidity();

    if (this.loginForm.invalid) {
      return;
    }

    const credentials: LoginCredentials = this.loginForm.getRawValue();

    this.isLoading = true;

    this.authService
      .login(credentials)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(this.loginDestination());
        },
        error: (error: HttpErrorResponse) => {
          const message =
            typeof error.error?.message === 'string' &&
            error.error.message.trim().length > 0
              ? error.error.message
              : 'E-mail ou senha inválidos!';

          this.customAlertService.error('Falha no login', message);
        },
      });
  }

  private loginDestination(): string {
    const destination = this.route.snapshot.queryParamMap.get('returnUrl');
    if (!destination) return '/home';
    try {
      const decoded = decodeURIComponent(destination);
      if (
        !destination.startsWith('/') ||
        decoded.startsWith('//') ||
        /[\\\u0000-\u001f\u007f]/.test(decoded)
      )
        return '/home';
      const tree = this.router.parseUrl(destination);
      const primary = tree.root.children['primary'];
      if (
        Object.keys(tree.root.children).some(
          (outlet) => outlet !== 'primary',
        ) ||
        !primary ||
        Object.keys(primary.children).length > 0 ||
        [
          'login',
          'register',
          'forgot-password',
          'verify-code',
          'reset-password',
        ].includes(primary.segments[0]?.path)
      )
        return '/home';
      // Navigation still runs the destination's guards, including AdminGuard.
      return this.router.serializeUrl(tree);
    } catch {
      return '/home';
    }
  }

  showError(
    formName: 'register' | 'login',
    controlName:
      | keyof typeof this.registerForm.controls
      | keyof typeof this.loginForm.controls,
  ): boolean {
    const control =
      formName === 'register'
        ? this.registerForm.controls[
            controlName as keyof typeof this.registerForm.controls
          ]
        : this.loginForm.controls[
            controlName as keyof typeof this.loginForm.controls
          ];

    return control.invalid && control.touched;
  }

  // Material checks this during change detection, after the group validator runs.
  // A mismatch is visible immediately; required follows touched/submit behavior.
  readonly confirmPasswordErrorMatcher: ErrorStateMatcher = {
    isErrorState: (control, form) =>
      !!control &&
      ((control.invalid && (control.touched || !!form?.submitted)) ||
        !!control.parent?.hasError('passwordsMismatch')),
  };

  passwordRequirementMet(requirement: PasswordRequirement): boolean {
    const password = this.registerForm.controls.password.value;

    const requirements: Record<PasswordRequirement, boolean> = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      symbol: /[?@#$%&]/.test(password),
    };

    return requirements[requirement];
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    const apiError = error.error?.message;

    if (apiError === 'email_duplicado') {
      return 'email_duplicado';
    }

    if (typeof apiError === 'string' && apiError.trim().length > 0) {
      return apiError;
    }

    if (error.status === 0) {
      return 'Não foi possível conectar ao servidor.';
    }

    if (error.status === 400) {
      return 'Dados inválidos. Revise as informações e tente novamente.';
    }

    if (error.status === 409) {
      return 'email_duplicado';
    }

    return 'Ocorreu um erro inesperado. Tente novamente mais tarde.';
  }
}
