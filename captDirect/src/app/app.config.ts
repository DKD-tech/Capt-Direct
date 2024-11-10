import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Socket } from 'ngx-socket-io';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor';

const socket = new Socket({ url: 'http://localhost:3000', options: {} });

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(),
    provideAnimationsAsync(),
    { provide: Socket, useValue: socket },
    provideHttpClient(
      withInterceptorsFromDi() // Assure que l'intercepteur est enregistré
    ),
    { provide: HTTP_INTERCEPTORS, useValue: AuthInterceptor, multi: true },
  ],
};
