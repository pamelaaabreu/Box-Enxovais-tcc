import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { API_BASE_URL } from '../config/api.config';

const publicEndpoints = new Set([
  '/login',
  '/register',
  '/send-reset-token',
  '/validate-reset-code',
  '/reset-password',
  '/validate-reset-token',
  '/api/newsletter/subscribe',
]);

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const auth = inject(AuthService);
  const document = inject(DOCUMENT);
  const baseUrl = inject(API_BASE_URL);

  // URLs relativas pertencem à origem do documento, não implicitamente à API.
  let url: URL;
  let api: URL;
  try {
    url = new URL(req.url, document.baseURI);
    api = new URL(baseUrl, document.baseURI);
  } catch {
    return next(req);
  }
  const apiPath = api.pathname.replace(/\/+$/, '');
  const endpoint = url.pathname.slice(apiPath.length);

  // Não envia o token para servidores externos
  // nem para os endpoints listados acima.
  if (
    url.origin !== api.origin ||
    (apiPath !== '' && !url.pathname.startsWith(`${apiPath}/`)) ||
    publicEndpoints.has(endpoint)
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
