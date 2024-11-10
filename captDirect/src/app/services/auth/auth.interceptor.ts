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

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    //     const authToken = localStorage.getItem('authToken');
    //     const clonedRequest = req.clone({
    //       headers: req.headers.set('Authorization', `Bearer ${authToken}`),
    //     });
    //     return next.handle(clonedRequest);
    //   }
    // }
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('HTTP Error:', error);
        return throwError(() => new Error(error.message));
      })
    );
  }
}
