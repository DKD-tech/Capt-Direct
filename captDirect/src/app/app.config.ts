import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Socket } from 'ngx-socket-io';
<<<<<<< HEAD
import { io } from 'socket.io-client';

const socket = new Socket({ url: 'http://localhost:3000', options: {} });
=======
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withFetch,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { AuthInterceptor } from './services/auth/auth.interceptor';

// const socket = new Socket({ url: 'http://192.168.1.69:3000', options: {} });
const socket = new Socket({ url: 'http://192.168.118.212:3000', options: {} });
>>>>>>> merge

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(),
    provideAnimationsAsync(),
    { provide: Socket, useValue: socket },
<<<<<<< HEAD
=======
    provideHttpClient(
      withInterceptorsFromDi(), // Assure que l'intercepteur est enregistré
      withFetch()
    ),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
>>>>>>> merge
  ],
};
