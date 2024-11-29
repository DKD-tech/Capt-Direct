import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private apiUrl = 'http://localhost:3000/api/sessions/info'; // URL de l'API backend
  // private apiUrl1 =
  // 'http://localhost:3000/api/sessions/sessionId/store-duration';

  constructor(private http: HttpClient) {}

  // Nouvelle méthode pour récupérer une session par ID
  getSessionById(sessionId: number): Observable<any> {
    console.log(`Récupération de la session ID : ${sessionId}`);
    return this.http.get<any>(`${this.apiUrl}/${sessionId}`).pipe(
      tap((response) => {
        console.log('Réponse de la session:', response);
      })
    );
  }

  // Exemple d'une méthode pour récupérer les segments avec sous-titres
  getSegmentsWithSubtitles(sessionId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${sessionId}`);
  }

  storeVideoDuration(sessionId: number, duration: number): Observable<any> {
    const url = `http://localhost:3000/api/sessions/store-duration/${sessionId}`;
    return this.http.post(url, {
      duration,
    });
  }
}
