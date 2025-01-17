// import { Injectable } from '@angular/core';
// import { Subtitle } from '../models/subtitle.model';

// @Injectable({
//   providedIn: 'root',
// })
// export class SubtitleService {
//   private subtitles: Subtitle[] = [];

//   constructor() {}

//   // Charger les sous-titres
//   loadSubtitles(subtitles: Subtitle[]): void {
//     this.subtitles = subtitles;
//   }

//   // Récupérer un sous-titre pour un moment donné
//   getSubtitleForTime(currentTime: number): Subtitle | null {
//     return this.subtitles.find(
//       (s) => s.startTime <= currentTime && s.endTime >= currentTime
//     ) || null;
//   }
// }
