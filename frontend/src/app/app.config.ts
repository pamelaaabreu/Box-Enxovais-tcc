import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    // Disponibiliza o sistema de rotas.
    provideRouter(routes),

    // Configura a comunicação HTTP e o interceptor.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),

    // Configura o suporte às animações.
    provideAnimationsAsync(),

    // Executa a inicialização da autenticação.
    provideAppInitializer(() => inject(AuthService).loadUser()),
  ],
};
