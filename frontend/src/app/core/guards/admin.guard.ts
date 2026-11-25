import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanMatch,
  Route,
  Router,
  RouterStateSnapshot,
  UrlSegment,
  UrlTree,
} from '@angular/router';

import { readValidJwt } from '../../shared/utils/jwt';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate, CanMatch {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Verifica a permissão antes de ativar a rota.
  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): boolean | UrlTree {
    return this.checkAdmin(state.url);
  }

  // Verifica se a rota administrativa pode ser selecionada.
  canMatch(_route: Route, segments: UrlSegment[]): boolean | UrlTree {
    const navigation = this.router.getCurrentNavigation();

    const destination = navigation
      ? this.router.serializeUrl(navigation.extractedUrl)
      : '/' + segments.map((segment) => segment.toString()).join('/');

    return this.checkAdmin(destination);
  }

  // Centraliza a verificação de acesso administrativo.
  private checkAdmin(returnUrl: string): boolean | UrlTree {
    const token = this.authService.getToken();

    if (!token) {
      return this.router.createUrlTree(['/login'], {
        queryParams: { returnUrl },
      });
    }

    try {
      const decodedToken = readValidJwt(token);

      if (!decodedToken) {
        return this.router.createUrlTree(['/login'], {
          queryParams: { returnUrl },
        });
      }

      // Normaliza o perfil recebido no token.
      const role = decodedToken.role?.trim().toLowerCase();

      if (role === 'admin') {
        return true;
      }

      // Clientes não podem acessar o painel.
      return this.router.createUrlTree(['/inicio']);
    } catch (error) {
      console.error('Erro ao decodificar o token:', error);

      return this.router.createUrlTree(['/login'], {
        queryParams: { returnUrl },
      });
    }
  }
}
