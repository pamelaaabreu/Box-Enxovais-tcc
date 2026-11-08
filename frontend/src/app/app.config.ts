import {
  APP_INITIALIZER,
  ApplicationConfig,
  importProvidersFrom,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { provideNgxMask } from 'ngx-mask';
import Swal from 'sweetalert2';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { withEventReplay } from '@angular/platform-browser';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { AuthService } from './core/services/auth.service';
import {
  LucideAngularModule,
  Check,
  X,
  AlertTriangle,
  Info,
  Loader2,
} from 'lucide-angular';

export function initializeAuth(authService: AuthService): () => void {
  return () => {
    authService.loadUser();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideNgxMask(),
    provideAnimationsAsync(),
    { provide: 'Swal', useValue: Swal },
    importProvidersFrom(
      LucideAngularModule.pick({
        Check,
        X,
        AlertTriangle,
        Info,
        Loader2,
      }),
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
};
