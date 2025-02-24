import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SubtitleService {
  /**
   * Nettoie le texte pour supprimer les espaces inutiles.
   */
  private cleanText(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
  }

  /**
   * Détecte une répétition partielle entre deux phrases.
   */
  private detectRepetition(currentText: string, nextText: string): boolean {
    const overlap = currentText.split(' ').slice(-3).join(' '); // Derniers 3 mots
    return nextText.startsWith(overlap);
  }

  /**
   * Fusionne deux textes avec gestion des répétitions.
   */
  private mergeWithRepetition(currentText: string, nextText: string): string {
    const overlap = currentText.split(' ').slice(-3).join(' ');
    return currentText + nextText.replace(overlap, '');
  }

  /**
   * Gère les chevauchements et fusionne les sous-titres pour produire un fichier final.
   * @param segments Liste des segments contenant des sous-titres.
   * @returns Liste de sous-titres corrigée.
   */
  processSubtitles(segments: any[]): any[] {
    return segments.map((segment, index) => {
      const currentSubtitles = this.cleanText(
        segment.subtitles.map((sub: any) => sub.text).join(' ')
      );
      let mergedSubtitles = currentSubtitles;

      if (index < segments.length - 1) {
        const nextSubtitles = this.cleanText(
          segments[index + 1].subtitles.map((sub: any) => sub.text).join(' ')
        );

        if (this.detectRepetition(currentSubtitles, nextSubtitles)) {
          mergedSubtitles = this.mergeWithRepetition(
            currentSubtitles,
            nextSubtitles
          );
        }
      }

      // Remplace les sous-titres fusionnés dans le segment actuel
      return {
        ...segment,
        subtitles: [
          {
            text: mergedSubtitles,
          },
        ],
      };
    });
  }
  exportToSrt(segments: any[]): string {
    return segments
      .map((segment, index) => {
        const start = segment.start_time.replace('.', ',');
        const end = segment.end_time.replace('.', ',');
        const text = segment.subtitles.map((sub: any) => sub.text).join('\n');
        return `${index + 1}\n${start} --> ${end}\n${text}\n`;
      })
      .join('\n');
  }
}
