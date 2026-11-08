import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

import { AuthService } from '../services/auth.service';
import { AppJwtPayload } from '../interfaces/auth.interface';


export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();

  if (!token) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  try {
    const decodedToken = jwtDecode<AppJwtPayload>(token);

    if (isTokenExpired(decodedToken)) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    return true;
  } catch (error) {
    console.error('Erro ao decodificar o token:', error);
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
};

function isTokenExpired(token: AppJwtPayload): boolean {
  if (!token.exp) {
    return true;
  }

  const expirationDateInMilliseconds = token.exp * 1000;

  return Date.now() >= expirationDateInMilliseconds;
}