import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

// Définition du type de réponse de l'API
interface AuthResponse {
  token: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl: string;
  private apiUrlL: string;
  private apiUrlSession: string;
  private ip_url: string;
  // private apiUrl = 'http://localhost:3000/api/auth'; // URL de l'API backend
  // private apiUrlL = 'http://localhost:3000/api/user';
  // private apiUrlSession = 'http://localhost:3000/api/session';
  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.ip_url = `${window.location.protocol}//${window.location.hostname}:3000`;
    } else {
      // Valeur fallback côté serveur si nécessaire (optionnel)
      this.ip_url = 'http://localhost:3000';
    }

    this.apiUrl = `${this.ip_url}/api/auth`;
    this.apiUrlL = `${this.ip_url}/api/user`;
    this.apiUrlSession = `${this.ip_url}/api/session`;
  }

  // Méthode pour récupérer la session de l'utilisateur
  getUserSession(): Observable<any> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('Aucun token disponible'));
    }

    const httpOptions = {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };

    return this.http.get(this.apiUrlSession, httpOptions).pipe(
      catchError((error) => {
        console.error('Échec de la récupération de la session:', error.message);
        return throwError(() => error);
      })
    );
  }
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
    const token = this.getToken();
    if (!token) {
      console.error('Token non disponible pour la déconnexion');
      return throwError(
        () => new Error('Aucun token trouvé pour la déconnexion')
      );
    }

    const httpOptions = {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };

    return this.http.post(`${this.apiUrlL}/logout`, {}, httpOptions).pipe(
      tap(() => {
        this.clearToken(); // Efface le token après la déconnexion réussie
        this.router.navigate(['/login']); // Redirige vers la page de connexion
      }),
      catchError((error) => {
        console.error('Échec de la déconnexion:', error.message);
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
      return localStorage.getItem('authToken');
    }
    return null;
  }

  private setToken(token: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  private clearToken(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('authToken');
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
