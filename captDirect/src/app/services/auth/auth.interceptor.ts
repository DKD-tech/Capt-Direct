import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const authToken = localStorage.getItem('authToken');
    console.log('Token récupéré dans localStorage:', authToken);

    const clonedRequest = authToken
      ? req.clone({
          headers: req.headers.set('Authorization', `Bearer ${authToken}`),
        })
      : req;

    console.log('Requête envoyée avec headers:', clonedRequest.headers);

    return next.handle(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('HTTP Error:', error);

        if (error.status === 401) {
          console.warn('Erreur 401: utilisateur non autorisé ou token expiré');
          this.router.navigate(['/login-page']);
        }

        return throwError(() => new Error(error.message));
      })
    );
  }
}
