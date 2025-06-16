import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Socket } from 'ngx-socket-io';
import { isPlatformBrowser } from '@angular/common';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withFetch,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { AuthInterceptor } from './services/auth/auth.interceptor';

const isBrowser = typeof window !== 'undefined';
const socketUrl = isBrowser
  ? `${window.location.protocol}//${window.location.hostname}:3000`
  : 'http://localhost:3000'; // fallback côté serveur

const socket = new Socket({ url: socketUrl, options: {} });
// const socket = new Socket({ url: 'http://localhost:3000', options: {} });

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(),
    provideAnimationsAsync(),
    { provide: Socket, useValue: socket },
    provideHttpClient(
      withInterceptorsFromDi(), // Assure que l'intercepteur est enregistré
      withFetch()
    ),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }, provideAnimationsAsync(),
  ],
};
