import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class SubtitleService {
  private apiUrl = 'http://localhost:3000/api'; // URL du backend

  constructor(private http: HttpClient) {}

  /**
   * 🔹 Correction d'un mot avant envoi au backend
   */
  adjustWord(segmentId: number, word: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/sessions/adjust-word`, { segment_id: segmentId, word }).pipe(
      tap(response => console.log('✅ Mot ajusté reçu du backend :', response)),
      catchError(error => {
        console.error("❌ Erreur ajustement mot :", error);
        return throwError(() => error);
      })
    );
  }

  /**
   * 🔹 Ajouter un mot avec correction automatique des chevauchements
   */
/**
 * 🔹 Ajouter une transcription à un segment 
 */
addSubtitle(segmentId: number, text: string, createdBy: number): Observable<any> {
  const url = `http://localhost:3000/api/sessions/add-subtitle`;
  const payload = {
    segment_id: segmentId,
    text: text,
    created_by: createdBy
  };

  console.log("📤 Payload envoyé :", payload);

  return this.http.post<any>(url, payload).pipe(
    tap((response) => {
      console.log("✅ Sous-titre ajouté :", response);
    }),
    catchError((error) => {
      console.error("❌ Erreur lors de l'ajout du sous-titre :", error);
      return throwError(() => error);
    })
  );
}


/**
* 🔹 Finaliser le segment après transcription complète
*/
finalizeSubtitle(segmentId: number, userId: number): Observable<any> {
  return this.http.post(`${this.apiUrl}/sessions/finalize-subtitle`, {
      segment_id: segmentId,
      created_by: userId
  }).pipe(
      tap(response => console.log('✅ Sous-titre finalisé :', response)),
      catchError(error => {
          console.error("❌ Erreur finalisation sous-titre :", error);
          return throwError(() => error);
      })
  );
}


  /**
   * 🔹 Récupérer les sous-titres d'un segment
   */
  getSubtitlesBySegment(segmentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/get-subtitles/${segmentId}`).pipe(
      tap(response => console.log('✅ Sous-titres récupérés :', response)),
      catchError(error => {
        console.error("❌ Erreur récupération sous-titres :", error);
        return throwError(() => error);
      })
    );
  }
}
