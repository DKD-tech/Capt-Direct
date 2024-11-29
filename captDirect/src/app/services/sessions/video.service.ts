import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class VideoService {
  getVideoDuration(videoUrl: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.src = videoUrl;

      videoElement.onloadedmetadata = () => {
        resolve(videoElement.duration);
      };

      videoElement.onerror = () => {
        reject(`Impossible de charger la vidéo depuis l'URL : ${videoUrl}`);
      };
    });
  }
}
