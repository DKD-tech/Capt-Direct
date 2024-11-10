import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

// Définition du type de réponse de l'API
interface AuthResponse {
  token: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth'; // URL de l'API backend
  private apiUrlL = 'http://localhost:3000/api/user';
  constructor(private http: HttpClient, private router: Router) {}

  // Méthode de connexion
  login(email: string, password: string): Observable<any> {
    console.log('Données envoyées :', { email, password });
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap((response) => {
          this.setToken(response.token);
        }),
        catchError((error) => {
          console.error('Login failed:', error.message);
          return of(null); // Retourne `null` pour indiquer l'échec
        })
      );
  }

  // Méthode d'inscription
  signup(
    email: string,
    password: string,
    username: string,
    role: string
  ): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    };
    return this.http
      .post(
        `${this.apiUrl}/signup`,
        { email, password, username, role },
        httpOptions
      )
      .pipe(
        tap((response) => {
          console.log('Response from signup:', response); // Vérifiez la réponse ici
        }),
        catchError((error) => {
          console.error('Signup failed:', error.message);
          return throwError(() => error);
        })
      );
  }

  // Méthode de déconnexion
  logout(): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getToken()}`, // Token JWT ajouté ici
      }),
    };
    return this.http.post(`${this.apiUrlL}/logout`, {}, httpOptions).pipe(
      tap(() => {
        this.clearToken(); // Supprime le token localement après la déconnexion
      }),
      catchError((error) => {
        console.error('Logout failed:', error.message);
        return throwError(() => error);
      })
    );
  }

  // Vérifie si l'utilisateur est authentifié
  isAuthenticated(): boolean {
    if (typeof localStorage !== 'undefined') {
      return !!this.getToken(); // Retourne true si un token est présent
    }
    return false; // Retourne false si `localStorage` n'est pas défini
  }

  public getToken(): string | null {
    // Vérifie si `localStorage` est disponible avant d'essayer de l'utiliser
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('jwtToken');
    }
    return null;
  }

  private setToken(token: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('jwtToken', token);
    }
  }

  private clearToken(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('jwtToken');
    }
  }

  // Méthode de gestion des erreurs
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return of(result as T);
    };
  }
}
