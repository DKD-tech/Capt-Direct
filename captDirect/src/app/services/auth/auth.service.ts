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
  private apiUrlSession = 'http://localhost:3000/api/session';
  constructor(private http: HttpClient, private router: Router) {}

  getUserSession(): Observable<any> {
    const token = this.getToken();
    if (!token) {
      console.error('Aucun token disponible dans le localStorage ou sessionStorage.');
      return throwError(() => new Error('Aucun token disponible'));
    }
  
    const httpOptions = {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  
    console.log('Requête envoyée avec headers :', httpOptions.headers);
  
    return this.http.get(this.apiUrlSession, httpOptions).pipe(
      tap((response) => console.log('Réponse brute de l\'API utilisateur :', response)),
      catchError((error) => {
        console.error('Échec de la récupération de la session:', error.message);
        return throwError(() => error);
      })
    );
  }
  
  login(email: string, password: string): Observable<any> {
    console.log('Données envoyées :', { email, password });
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap((response) => {
          this.setToken(response.token); // Stocke le token dans localStorage
          
          // Décoder le token pour extraire l'ID utilisateur
          const decodedToken: any = this.decodeToken(response.token);
          if (decodedToken && decodedToken.id) {
            localStorage.setItem('userId', decodedToken.id); // Enregistre l'ID utilisateur
            console.log('ID utilisateur extrait du token et enregistré :', decodedToken.id);
          } else {
            console.error('Impossible d\'extraire l\'ID utilisateur du token.');
          }
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
  private decodeToken(token: string): any {
    try {
      const payload = JSON.parse(atob(token.split('.')[1])); // Décodage de la partie payload du JWT
      console.log('Payload décodé du token :', payload);
      return payload;
    } catch (error) {
      console.error('Erreur lors du décodage du token :', error);
      return null;
    }
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
