import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { AuthService } from './core/services/auth.service';

export function initializeAuth(authService: AuthService): () => void {
  return () => {
    authService.loadUser();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    // Disponibiliza o sistema de rotas.
    provideRouter(routes),

    // Configura a comunicação HTTP e o interceptor.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),

    // Configura o suporte às animações.
    provideAnimationsAsync(),

    // Executa a inicialização da autenticação.
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
};
