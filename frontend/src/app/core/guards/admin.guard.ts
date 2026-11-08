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
import { jwtDecode } from 'jwt-decode';
import { AuthService } from '../services/auth.service';
import { AppJwtPayload } from '../interfaces/auth.interface';

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate, CanMatch {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): boolean | UrlTree {
    return this.checkAdmin(state.url);
  }

  canMatch(route: Route, segments: UrlSegment[]): boolean | UrlTree {
    const navigation = this.router.getCurrentNavigation();
    const destination = navigation ? this.router.serializeUrl(navigation.extractedUrl) : '/' + segments.map(segment => segment.toString()).join('/');
    return this.checkAdmin(destination);
  }

  private checkAdmin(returnUrl: string): boolean | UrlTree {
    const token = this.authService.getToken();

    if (!token) {
      return this.router.createUrlTree(['/login'], { queryParams: { returnUrl } });
    }

    try {
      const decodedToken = jwtDecode<AppJwtPayload>(token);

      if (this.isTokenExpired(decodedToken)) {
        return this.router.createUrlTree(['/login'], { queryParams: { returnUrl } });
      }

      const role = decodedToken.role?.trim().toLowerCase();

      if (role === 'admin') {
        return true;
      }

      return this.router.createUrlTree(['/home']);
    } catch (error) {
      console.error('Erro ao decodificar o token:', error);
      return this.router.createUrlTree(['/login'], { queryParams: { returnUrl } });
    }
  }

  private isTokenExpired(token: AppJwtPayload): boolean {
    if (!token.exp) {
      return true;
    }

    const expirationDateInMilliseconds = token.exp * 1000;

    return Date.now() >= expirationDateInMilliseconds;
  }
}
