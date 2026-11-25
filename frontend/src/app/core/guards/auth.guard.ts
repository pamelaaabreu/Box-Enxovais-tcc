import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

import { AuthService } from '../services/auth.service';
import { AppJwtPayload } from '../interfaces/auth.interface';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Recupera o token armazenado.
  const token = authService.getToken();

  // Redireciona para o login quando não existe token.
  if (!token) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  try {
    // Decodifica o conteúdo do JWT.
    const decodedToken = jwtDecode<AppJwtPayload>(token);

    // Impede a navegação quando o token está expirado.
    if (isTokenExpired(decodedToken)) {
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    return true;
  } catch (error) {
    console.error('Erro ao decodificar o token:', error);

    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }
};

function isTokenExpired(token: AppJwtPayload): boolean {
  // Considera inválidos tokens sem expiração.
  if (!token.exp) {
    return true;
  }

  // Converte segundos para milissegundos.
  const expirationDateInMilliseconds = token.exp * 1000;

  return Date.now() >= expirationDateInMilliseconds;
}
