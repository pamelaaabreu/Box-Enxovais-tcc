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

  // Interpreta a URL da requisição.
  const url = new URL(req.url, 'http://localhost:8080');

  // Endpoints que não precisam receber o JWT.
  const publicEndpoints = new Set([
    '/login',
    '/register',
    '/send-reset-token',
    '/validate-reset-code',
    '/reset-password',
    '/validate-reset-token',
  ]);

  // Não envia o token para servidores externos
  // nem para os endpoints listados acima.
  if (
    url.origin !== 'http://localhost:8080' ||
    publicEndpoints.has(url.pathname)
  ) {
    return next(req);
  }

  const token = auth.getToken();

  // Encaminha a requisição sem token, caso não exista.
  if (!token) return next(req);

  // Verifica se a sessão continua válida.
  if (!auth.isLoggedIn()) return next(req);

  // Clona a requisição adicionando o JWT.
  const authorized = req.clone({
    headers: req.headers.set('Authorization', `Bearer ${token}`),
  });

  return next(authorized).pipe(
    // Intercepta erros retornados pelo backend.
    catchError((error: unknown) => {
      // Trata sessões rejeitadas pelo servidor.
      if (error instanceof HttpErrorResponse && error.status === 401) {
        auth.handleUnauthorized(token);
      }

      // Propaga o erro para o consumidor da requisição.
      return throwError(() => error);
    }),
  );
};
