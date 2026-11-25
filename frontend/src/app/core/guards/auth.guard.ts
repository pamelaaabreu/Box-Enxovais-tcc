import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { readValidJwt } from '../../shared/utils/jwt';

import { AuthService } from '../services/auth.service';

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

  if (!readValidJwt(token)) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  return true;
};
