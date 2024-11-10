import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3000/api/auth';

  constructor(private http: HttpClient, private router: Router) {}
  login(email: string, password: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.API_URL}/login`, {
      email,
      password,
    });
  }

  signup(
    email: string,
    password: string,
    username: string
  ): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.API_URL}/signup`, {
      email,
      password,
      username,
    });
  }
  // signup(data: {
  //   email: string;
  //   password: string;
  //   username?: string;
  //   role?: string;
  // }): Observable<{ token: string }> {
  //   return this.http.post<{ token: string }>(
  //     `${this.API_URL}/api/auth/signup`,
  //     data
  //   );
  // }

  logout(): void {
    localStorage.removeItem('authToken'); // Suppression du token pour déconnexion
    this.router.navigate(['/login-page']);
  }

  // getToken(): string | null {
  //   return localStorage.getItem('authToken');
  // }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  setToken(token: string): void {
    localStorage.setItem('jwtToken', token);
  }

  getToken(): string | null {
    return localStorage.getItem('jwtToken');
  }

  clearToken(): void {
    localStorage.removeItem('jwtToken');
  }
}
