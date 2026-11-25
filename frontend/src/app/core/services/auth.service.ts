import { Injectable, PLATFORM_ID, inject, OnDestroy } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { CustomAlertService } from './custom-alert.service';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subject, tap } from 'rxjs';
import {
  LoginCredentials,
  LoginResponse,
  RegisterPayload,
} from '../interfaces/auth.interface';

// Estrutura genérica de resposta da API.
interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

interface ResetAuthorization {
  resetToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  // Injeção de dependências.
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private readonly alerts = inject(CustomAlertService);

  // Controla a expiração automática da sessão.
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionExpiryHandled = false;

  // Token de recuperação mantido apenas em memória.
  private passwordResetToken: string | null = null;

  private baseUrl = 'http://localhost:8080';

  public isLogged = false;
  public userName: string | null = null;

  // Notifica alterações na sessão.
  public userChanged = new Subject<void>();

  private readonly savedNameChanges = new Subject<void>();

  readonly savedNameChanged = this.savedNameChanges.asObservable();

  // Atualiza o nome após uma alteração cadastral.
  updateSavedName(name: string): void {
    if (
      !this.isBrowser() ||
      !this.getToken() ||
      !name.trim() ||
      this.getUserName() === name
    )
      return;

    sessionStorage.setItem('userName', name);

    this.userName = name;
    this.savedNameChanges.next();
  }

  // Recupera a sessão armazenada ao iniciar a aplicação.
  loadUser(): void {
    if (!this.isBrowser()) return;

    const token = sessionStorage.getItem('authToken');

    if (!token) {
      this.clearExpiryTimer();
      this.isLogged = false;
      this.userName = null;
      return;
    }

    this.isLogged = true;
    this.userName = sessionStorage.getItem('userName');

    this.scheduleTokenExpiry(token);
  }

  // Realiza a autenticação.
  login(credentials: LoginCredentials): Observable<LoginResponse> {
    const payload: LoginCredentials = {
      email: credentials.email,
      password: credentials.password,
    };

    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, payload).pipe(
      // Executa efeitos adicionais após receber a resposta.
      tap((response) => {
        if (!this.isBrowser() || !response?.token) {
          return;
        }

        this.clearExpiryTimer();

        this.sessionExpiryHandled = false;

        this.saveAuthData(response);
        this.scheduleTokenExpiry(response.token);

        this.isLogged = true;
        this.userName = response.name || null;

        // Notifica os consumidores sobre a alteração da sessão.
        this.userChanged.next();
      }),
    );
  }

  // Cadastra um novo cliente.
  register(userData: RegisterPayload): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/register`, userData);
  }

  // Solicita o código de recuperação.
  requestPasswordReset(email: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/send-reset-token`, { email });
  }

  // Valida o código enviado ao e-mail.
  validateResetCode(
    email: string,
    code: string,
  ): Observable<ApiResponse<ResetAuthorization>> {
    return this.http.post<ApiResponse<ResetAuthorization>>(
      `${this.baseUrl}/validate-reset-code`,
      { email, code },
    );
  }

  // Envia a nova senha junto ao token de recuperação.
  resetPassword(resetToken: string, newPassword: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/reset-password`, {
      resetToken,
      newPassword,
    });
  }

  // Verifica a validade do token de recuperação.
  validateResetToken(token: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/validate-reset-token`, {
      resetToken: token,
    });
  }

  // Mantém o token somente na instância do service.
  savePasswordResetToken(token: string): void {
    this.passwordResetToken = token;
  }

  getPasswordResetToken(): string | null {
    return this.passwordResetToken;
  }

  clearPasswordResetToken(): void {
    this.passwordResetToken = null;

    if (this.isBrowser()) sessionStorage.removeItem('passwordResetToken');
  }

  // Armazena temporariamente o e-mail da recuperação.
  savePasswordResetEmail(email: string): void {
    if (this.isBrowser()) {
      sessionStorage.setItem('passwordResetEmail', email);
    }
  }

  getPasswordResetEmail(): string | null {
    if (!this.isBrowser()) {
      return null;
    }

    return sessionStorage.getItem('passwordResetEmail');
  }

  clearPasswordResetEmail(): void {
    if (this.isBrowser()) {
      sessionStorage.removeItem('passwordResetEmail');
    }
  }

  // Encerra a sessão.
  logout(): void {
    this.clearExpiryTimer();

    if (this.isBrowser()) this.clearAuthData();

    this.isLogged = false;
    this.userName = null;

    this.userChanged.next();

    void this.router.navigate(['/login']);
  }

  // Verifica se existe um token dentro da validade.
  isLoggedIn(): boolean {
    const token = this.getToken();

    if (!token) return false;

    if (!this.hasValidExpiry(token)) {
      this.expireSession(token);
      return false;
    }

    return true;
  }

  // Trata a rejeição de uma requisição autenticada.
  handleUnauthorized(tokenUsed: string): void {
    // Ignora respostas atrasadas de sessões anteriores.
    if (this.getToken() !== tokenUsed) return;

    this.expireSession(tokenUsed);
  }

  // Verifica a expiração contida no JWT.
  private hasValidExpiry(token: string): boolean {
    try {
      const { exp } = jwtDecode<{ exp?: number }>(token);

      return (
        typeof exp === 'number' &&
        Number.isFinite(exp) &&
        exp * 1000 > Date.now()
      );
    } catch {
      return false;
    }
  }

  // Programa o encerramento automático da sessão.
  private scheduleTokenExpiry(token: string): void {
    this.clearExpiryTimer();

    if (!this.isBrowser()) return;

    try {
      const { exp } = jwtDecode<{ exp?: number }>(token);

      if (typeof exp !== 'number' || !Number.isFinite(exp)) {
        this.expireSession(token);
        return;
      }

      const remaining = exp * 1000 - Date.now();

      if (remaining <= 0) {
        this.expireSession(token);
        return;
      }

      // Respeita o limite de duração dos timers do navegador.
      this.expiryTimer = setTimeout(
        () => this.scheduleTokenExpiry(token),
        Math.min(remaining, 2_147_483_647),
      );
    } catch {
      this.expireSession(token);
    }
  }

  // Encerra uma sessão expirada ou rejeitada.
  private expireSession(token: string): void {
    // Evita processamento duplicado ou de sessões anteriores.
    if (
      !this.isBrowser() ||
      this.sessionExpiryHandled ||
      this.getToken() !== token
    )
      return;

    this.sessionExpiryHandled = true;

    this.clearExpiryTimer();

    const currentUrl = this.router.url;

    // Identifica páginas relacionadas à autenticação.
    const isAuthPage =
      /^\/(login|register|forgot-password|verify-code|reset-password)(?:[/?#]|$)/.test(
        currentUrl,
      );

    // Preserva somente um destino interno.
    const returnUrl =
      !isAuthPage && currentUrl.startsWith('/') && !currentUrl.startsWith('//')
        ? currentUrl
        : null;

    this.clearAuthData();

    this.isLogged = false;
    this.userName = null;

    this.userChanged.next();

    void this.router.navigate(['/login'], {
      queryParams: returnUrl ? { returnUrl } : {},
    });

    // Apresenta a mensagem de sessão expirada.
    this.alerts.info(
      'Sua sessão expirou',
      'Por segurança, entre novamente para continuar.',
      {
        duration: 8000,
      },
    );
  }

  // Cancela o timer existente.
  private clearExpiryTimer(): void {
    if (this.expiryTimer !== null) clearTimeout(this.expiryTimer);

    this.expiryTimer = null;
  }

  ngOnDestroy(): void {
    this.clearExpiryTimer();
  }

  // Recupera informações armazenadas na sessão.
  getUserName(): string | null {
    if (!this.isBrowser()) {
      return null;
    }

    return sessionStorage.getItem('userName');
  }

  getUserEmail(): string | null {
    if (!this.isBrowser()) {
      return null;
    }

    return sessionStorage.getItem('userEmail');
  }

  getUserRole(): string | null {
    if (!this.isBrowser()) {
      return null;
    }

    return sessionStorage.getItem('userRole');
  }

  getToken(): string | null {
    if (!this.isBrowser()) {
      return null;
    }

    return sessionStorage.getItem('authToken');
  }

  // Persiste os dados da sessão.
  private saveAuthData(response: LoginResponse): void {
    sessionStorage.setItem('authToken', response.token);

    if (response.name) {
      sessionStorage.setItem('userName', response.name);
    }

    if (response.email) {
      sessionStorage.setItem('userEmail', response.email);
    }

    if (response.role) {
      sessionStorage.setItem('userRole', response.role);
    }

    this.removeOldLocalStorageAuthData();
  }

  // Remove os dados da autenticação.
  private clearAuthData(): void {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userRole');

    this.removeOldLocalStorageAuthData();
  }

  // Remove dados de uma implementação anterior.
  private removeOldLocalStorageAuthData(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
  }

  // Verifica se o código está sendo executado no navegador.
  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}
