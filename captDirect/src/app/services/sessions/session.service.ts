import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  // private apiUrl = 'http://192.168.1.69:3000/api/sessions/info'; // URL de l'API backend
  // baseUrl = `http://192.168.1.69:3000:api/sessions`;
  private apiUrl = 'http://192.168.118.212:3000/api/sessions/info'; // URL de l'API backend
  baseUrl = `http://192.168.118.212:3000:api/sessions`;
  // private apiUrl1 =
  // 'http:// 192.168.118.212:3000/api/sessions/sessionId/store-duration';

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
    // const url = `http://192.168.1.69:3000/api/sessions/store-duration/${sessionId}`;
    const url = `http://192.168.118.212:3000/api/sessions/store-duration/${sessionId}`;
    return this.http.post(url, {
      duration,
    });
  }
  // **Nouvelle méthode : démarrer le streaming**
  startStreaming(sessionId: number): Observable<any> {
    return this.http.post<any>(
      // `http://192.168.1.69:3000/api/sessions/stream/${sessionId}`,
      `http://192.168.118.212:3000/api/sessions/stream/${sessionId}`,
      {}
    );
  }

  startStream(sessionId: number): Observable<{ startTime: number }> {
    // const url = `http://192.168.1.69:3000/api/sessions/start-stream/${sessionId}`;
    const url = `http://192.168.118.212:3000/api/sessions/start-stream/${sessionId}`;
    return this.http.post<{ startTime: number }>(url, {});
  }

  getSegmentsWithSession(sessionId: number): Observable<any> {
    // const segurl = `http://192.168.1.69:3000/api/sessions/segments/${sessionId}`;
    const segurl = `http://192.168.118.212:3000/api/sessions/segments/${sessionId}`;
    return this.http.get<any>(segurl).pipe(
      tap((response) => {
        console.log('Segments récupérés pour la session :', response);
      })
    );
  }

  saveSubtitle(segmentId: number, text: string): Observable<any> {
    // const suburl = `http://192.168.1.69:3000/api/sessions/segments/${segmentId}/subtitles`;
    const suburl = `http://192.168.118.212:3000/api/sessions/segments/${segmentId}/subtitles`;
    return this.http.post<any>(suburl, { text }).pipe(
      tap((response) => {
        console.log('Sous-titre sauvegardé :', response);
      })
    );
  }

  addSubtitle(
    segmentId: number,
    text: string,
    createdBy: number
  ): Observable<any> {
    // const url = `http://192.168.1.69:3000/api/sessions/add-subtitle`;
    const url = `http://192.168.118.212:3000/api/sessions/add-subtitle`;
    const payload = {
      segment_id: segmentId,
      text: text,
      created_by: createdBy,
    };
    return this.http.post<any>(url, payload).pipe(
      tap((response) => {
        console.log('Sous-titre ajouté :', response);
      })
    );
  }

  // startStreaming(sessionId: number): void {
  //   this.http.post(`/api/sessions/stream/${sessionId}`, {}).subscribe({
  //     next: (response) => console.log("Streaming démarré :", response),
  //     error: (err) => console.error("Erreur lors du démarrage du streaming :", err),
  //   });
  // }
}
