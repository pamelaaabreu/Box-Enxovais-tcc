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
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private readonly alerts = inject(CustomAlertService);
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionExpiryHandled = false;

  private passwordResetToken: string | null = null;

  private baseUrl = 'http://localhost:8080';

  public isLogged = false;
  public userName: string | null = null;
  public userChanged = new Subject<void>();

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

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    const payload: LoginCredentials = {
      email: credentials.email,
      password: credentials.password,
    };

    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, payload).pipe(
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
        this.userChanged.next();
      }),
    );
  }

  register(userData: RegisterPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, userData);
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/send-reset-token`, { email });
  }

  validateResetCode(
    email: string,
    code: string,
  ): Observable<ApiResponse<ResetAuthorization>> {
    return this.http.post<ApiResponse<ResetAuthorization>>(
      `${this.baseUrl}/validate-reset-code`,
      { email, code },
    );
  }

  resetPassword(resetToken: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/reset-password`, {
      resetToken,
      newPassword,
    });
  }

  validateResetToken(token: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/validate-reset-token`, {
      resetToken: token,
    });
  }

  // Kept only in this service instance, never in URLs or browser storage.
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

  logout(): void {
    this.clearExpiryTimer();
    if (this.isBrowser()) this.clearAuthData();
    this.isLogged = false;
    this.userName = null;
    this.userChanged.next();
    void this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    if (!this.hasValidExpiry(token)) {
      this.expireSession(token);
      return false;
    }
    return true;
  }

  /** Called only when an authenticated request's token is rejected. */
  handleUnauthorized(tokenUsed: string): void {
    if (this.getToken() !== tokenUsed) return; // Ignore a late 401 from a previous session.
    this.expireSession(tokenUsed);
  }

  /** JWT contents are hints for the UI, never an authorization decision. */
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
      // Browsers clamp long timers: reschedule until the actual expiration.
      this.expiryTimer = setTimeout(
        () => this.scheduleTokenExpiry(token),
        Math.min(remaining, 2_147_483_647),
      );
    } catch {
      this.expireSession(token);
    }
  }

  private expireSession(token: string): void {
    if (
      !this.isBrowser() ||
      this.sessionExpiryHandled ||
      this.getToken() !== token
    )
      return;
    this.sessionExpiryHandled = true;
    this.clearExpiryTimer();
    const currentUrl = this.router.url;
    const isAuthPage =
      /^\/(login|register|forgot-password|verify-code|reset-password)(?:[/?#]|$)/.test(
        currentUrl,
      );
    // Only preserve an internal destination; route guards still enforce permissions.
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
    this.alerts.info(
      'Sua sessão expirou',
      'Por segurança, entre novamente para continuar.',
      {
        duration: 8000,
      },
    );
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimer !== null) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
  }

  ngOnDestroy(): void {
    this.clearExpiryTimer();
  }

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

  private clearAuthData(): void {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userRole');

    this.removeOldLocalStorageAuthData();
  }

  private removeOldLocalStorageAuthData(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}
