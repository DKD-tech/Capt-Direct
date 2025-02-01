import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SubtitleService {
  private apiUrl = 'http://localhost:3000/api'; // Remplace par ton URL backend

  constructor(private http: HttpClient) {}

  /**
   * Ajouter un mot au sous-titre en temps réel
   */
  addWordToSubtitle(segmentId: number, word: string, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/add-word-to-subtitle`, {
      segment_id: segmentId,
      word,
      created_by: userId,
    });
  }

  /**
   * Finaliser le sous-titre après saisie complète
   */
  finalizeSubtitle(segmentId: number, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/finalize-subtitle`, {
      segment_id: segmentId,
      created_by: userId,
    });
  }

  /**
   * Récupérer les sous-titres d'un segment
   */
  getSubtitlesBySegment(segmentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/get-subtitles/${segmentId}`);
  }
}
