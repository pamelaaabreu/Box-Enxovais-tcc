import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './services/auth.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const auth = inject(AuthService);
  const url = new URL(req.url, 'http://localhost:8080');
  const publicEndpoints = new Set([
    '/login',
    '/register',
    '/send-reset-token',
    '/validate-reset-code',
    '/reset-password',
    '/validate-reset-token',
  ]);
  if (
    url.origin !== 'http://localhost:8080' ||
    publicEndpoints.has(url.pathname)
  ) {
    return next(req);
  }
  const token = auth.getToken();
  if (!token) return next(req);

  if (!auth.isLoggedIn()) return next(req);

  const authorized = req.clone({
    headers: req.headers.set('Authorization', `Bearer ${token}`),
  });
  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        auth.handleUnauthorized(token);
      }
      return throwError(() => error);
    }),
  );
};
