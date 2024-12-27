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

  // getSubtitleForTime(currentTime: number): Subtitle | null {
  //   const subtitle = this.subtitles.find(
  //     (s) => s.startTime <= currentTime && s.endTime >= currentTime
  //   );

  //   if (subtitle) {
  //     // Vérification CPL et CPS
  //     if (subtitle.text.length > 80) {
  //       console.warn('Sous-titre dépasse 2 lignes, réajustez.');
  //     }

  //     const cps =
  //       subtitle.text.length / (subtitle.endTime - subtitle.startTime);
  //     if (cps > 20) {
  //       console.warn('Caractères par seconde trop élevés.');
  //     }
  //   }

  //   return subtitle || null;
  // }
}
