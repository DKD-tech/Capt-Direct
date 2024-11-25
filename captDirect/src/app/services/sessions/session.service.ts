import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private apiUrl = 'http://localhost:3000/api/sessions'; // URL de l'API backend

  constructor(private http: HttpClient) {}

  // Nouvelle méthode pour récupérer une session par ID
  getSessionById(sessionId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${sessionId}`);
  }

  // Exemple d'une méthode pour récupérer les segments avec sous-titres
  getSegmentsWithSubtitles(sessionId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${sessionId}`);
  }
}
