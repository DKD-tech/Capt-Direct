import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../services/sessions/session.service';

@Component({
  selector: 'app-streaming',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './streaming.component.html',
  styleUrl: './streaming.component.scss',
})
export class StreamingComponent implements OnInit {
  videoUrl: string = '';
  subtitles: string = '';
  convertedVttUrl: string = '';

  constructor(
    private route: ActivatedRoute,
    private sessionService: SessionService
  ) {}

  ngOnInit(): void {
    const sessionId = Number(this.route.snapshot.paramMap.get('sessionId'));
    console.log('📌 sessionId reçu :', sessionId);

    if (!isNaN(sessionId) && sessionId > 0) {
      this.loadSessionData(sessionId);
    } else {
      console.error('❌ sessionId est invalide.');
    }

    // Récupérer le fichier SRT généré
    const savedSrt = localStorage.getItem('srtFile');
    this.subtitles = savedSrt ? savedSrt : '⚠️ Aucun sous-titre disponible.';
    console.log('📌 Sous-titres chargés :', this.subtitles);

    if (savedSrt) {
      this.convertSrtToVtt(savedSrt); // 🔹 Convertit et charge les sous-titres
      console.log('📌 URL du fichier VTT généré :', this.convertedVttUrl);
    }
  }
  downloadSubtitles(): void {
    if (!this.subtitles.trim()) {
      console.error('❌ Aucun sous-titre à télécharger.');
      return;
    }

    const blob = new Blob([this.subtitles], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtitles.srt';
    a.click();
    URL.revokeObjectURL(url);

    console.log('✅ Téléchargement du fichier SRT lancé.');
  }

  loadSessionData(sessionId: number): void {
    this.sessionService.getSessionById(sessionId).subscribe({
      next: (response) => {
        console.log('📌 Données de la session récupérées :', response);

        if (response && response.video_url) {
          this.videoUrl = `/videos/${response.video_url}`;
          console.log('✅ Vidéo chargée :', this.videoUrl);
        } else {
          console.error('❌ Aucune vidéo trouvée pour cette session.');
          this.videoUrl = '';
        }
      },
      error: (error) => {
        console.error('❌ Erreur lors de la récupération de la vidéo :', error);
        this.videoUrl = '';
      },
    });
  }

  // 🔹 Conversion de SRT en VTT
  convertSrtToVtt(srt: string): void {
    console.log('🔄 Conversion du fichier SRT en VTT...');

    const vttText =
      'WEBVTT\n\n' +
      srt
        .replace(/\r\n|\r|\n/g, '\n') // Normalisation des retours à la ligne
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2'); // Convertit "," en "."

    console.log('📌 Fichier VTT généré :', vttText);

    // 🔹 Création d'un fichier temporaire .vtt
    const blob = new Blob([vttText], { type: 'text/vtt' });
    this.convertedVttUrl = URL.createObjectURL(blob);
    console.log('✅ URL du fichier VTT :', this.convertedVttUrl);
  }
}
