// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable } from 'rxjs';

// @Injectable({
//   providedIn: 'root',
// })
// export class RedisService {
//   private redisApiUrl = 'http://localhost:3000/api/sessions//save-video-duration'; // URL de l'API Redis backend

//   constructor(private http: HttpClient) {}

//   // Méthode pour récupérer une clé Redis
//   getRedisKey(key: string): Observable<any> {
//     return this.http.get<any>(`${this.redisApiUrl}/${key}`);
//   }

//   // Méthode pour définir une clé Redis
//   setRedisKey(key: string, value: any): Observable<any> {
//     return this.http.post<any>(`${this.redisApiUrl}/set`, { key, value });
//   }

//   // Méthode pour supprimer une clé Redis
//   deleteRedisKey(key: string): Observable<any> {
//     return this.http.delete<any>(`${this.redisApiUrl}/${key}`);
//   }
// }

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class VideoService {
  getVideoDuration(videoUrl: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const videoElement = document.createElement('video');
      videoElement.src = videoUrl;
      videoElement.preload = 'metadata';

      videoElement.addEventListener('loadedmetadata', () => {
        resolve(videoElement.duration);
      });

      videoElement.addEventListener('error', () => {
        reject(`Impossible de charger la vidéo depuis l'URL : ${videoUrl}`);
      });
    });
  }
}
