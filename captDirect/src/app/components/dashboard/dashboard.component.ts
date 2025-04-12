import { SubtitleService } from './../../services/sessions/subtitle.service';
import { VideoService } from './../../services/sessions/video.service';
import { AuthService } from './../../services/auth/auth.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SocketService } from '../../services/socket.service';
// import { SubtitleService } from '../../services/sessions/subtitle.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService } from '../../services/sessions/session.service';
import { CommonModule } from '@angular/common';
<<<<<<< HEAD
import { ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { NgZone } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';



=======
import test from 'node:test';
>>>>>>> 674c77ed34e1c47deb521db74c8ed3e699ddb6ba
// import videojs from 'video.js';
// import WaveSurfer from 'wavesurfer.js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatIconModule, FormsModule, CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
<<<<<<< HEAD
  
=======
>>>>>>> 674c77ed34e1c47deb521db74c8ed3e699ddb6ba
  isAuthenticated: boolean = false;
  isLoading = true;
  subtitleText = '';
  displayedSubtitle = '';
  userId: number = 0; // Identifiant utilisateur récupéré dynamiquement
  videoUrl = ''; // URL de la vidéo récupérée dynamiquement
<<<<<<< HEAD
  sessionId: number = 28; // ID de la session à afficher
=======
  sessionId: number = 21; // ID de la session à afficher
>>>>>>> 674c77ed34e1c47deb521db74c8ed3e699ddb6ba
  segments: any[] = [];
  username: string = '';
  collaborators: number = 1; // Nombre de collaborateurs en ligne
  user: any;
  users: string[] = [];
  sessionName: string = '';
  sessionDescription: string = '';
  sessionStatus: string = '';
  // Ajout d'une propriété pour stocker la durée de la vidéo
  duration: number | null = null;
  // duration: number;
  hasStartedTyping = false; // ✅ Ajout : Variable pour vérifier si l'utilisateur a commencé à écrire
  videoLoaded = false; // ✅ Ajout : Variable pour suivre le chargement de la vidéo
  activeSegment: any = null; // Le segment actuellement en cours
<<<<<<< HEAD
  nextSegment: any = null;
  sessionStartTime: number = Date.now(); // 
  officialStartTime = 0;//🕒 Temps de début de session (sera mis à jour dynamiquement)
  elapsedTime = 0;
  streamStarted = false;
  countdown = 5;
  countdownMessage = '';
  private signalUpdateInterval: any = null;




  
=======
  sessionStartTime: number = Date.now(); // 🕒 Temps de début de session (sera mis à jour dynamiquement)
>>>>>>> 674c77ed34e1c47deb521db74c8ed3e699ddb6ba

  // // Méthode pour calculer la durée de la vidéo
  // calculateVideoDuration(videoUrl: string): void {
  //   const videoElement = document.createElement('video');
  //   videoElement.src = videoUrl;

  //   videoElement.onloadedmetadata = () => {
  //     const duration = videoElement.duration;
  //     console.log('Durée de la vidéo :', duration);
  //     this.videoDuration = duration;

  //     // Appel pour enregistrer la durée dans Redis via le backend
  //     this.saveVideoDurationToRedis(duration);
  //   };

  //   videoElement.onerror = () => {
  //     console.error(
  //       'Erreur lors du chargement de la vidéo pour calculer la durée'
  //     );
  //   };
  // }

  // saveVideoDurationToRedis(duration: number): void {
  //   // Envoie la durée au backend pour la stocker dans Redis
  //   this.sessionService.saveVideoDuration(this.sessionId, duration).subscribe({
  //     next: () => {
  //       console.log('Durée de la vidéo sauvegardée dans Redis avec succès.');
  //     },
  //     error: (error) => {
  //       console.error(
  //         'Erreur lors de la sauvegarde de la durée de la vidéo dans Redis :',
  //         error
  //       );
  //     },
  //   });
  // }

  constructor(
    private socketService: SocketService,
    private authService: AuthService,
    private router: Router,
    private sessionService: SessionService,
    private videoService: VideoService,
<<<<<<< HEAD
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private cdRef: ChangeDetectorRef,
    private SubtitleService: SubtitleService
  ) {}

  
=======
    private SubtitleService: SubtitleService
  ) {}

>>>>>>> 674c77ed34e1c47deb521db74c8ed3e699ddb6ba
  ngOnInit() {
    this.loadUserSession();
    this.loadSessionDetails();
    this.connectToSocket();
    this.loadSessionInfo();
    this.loadSegments();
    this.authService.getUserSession().subscribe((user) => {
      this.username = user.username.trim();
      this.userId = Number(user.user_id);

      // Rejoindre la session via Socket.IO
      this.socketService.joinSession(
        this.sessionId,
        this.username,
        this.userId
      );

      // Écouter les mises à jour des utilisateurs connectés
      this.socketService.getUsers().subscribe((users) => {
        this.users = users;
        console.log('Utilisateurs connectés à la session :', this.users);
      });
    });
  }
<<<<<<< HEAD

  startStream(): void {
    this.sessionService.startStream(this.sessionId).subscribe({
      next: (res: any) => {
        this.countdown = 5;
        this.streamStarted = true;
  
        const interval = setInterval(() => {
          if (this.countdown > 0) {
            this.countdownMessage = `Démarrage dans ${this.countdown} seconde(s)...`;
            this.countdown--;
          } else {
            clearInterval(interval);
            this.countdownMessage = '';
            
          }
        }, 1000);
      },
      error: (err) => {
        console.error('Erreur lors du démarrage du flux', err);
      },
    });
  }
  

 
  
=======
>>>>>>> 674c77ed34e1c47deb521db74c8ed3e699ddb6ba
  onUserTyping(segment: any) {
    if (!this.hasStartedTyping) {
      this.hasStartedTyping = true;
      console.log(
        '🖱️ L’utilisateur a cliqué sur la zone de texte, démarrage des timers.'
      );
<<<<<<< HEAD
      //this.startTimers(); // ✅ Démarrer immédiatement le minuteur
=======
      this.startTimers(); // ✅ Démarrer immédiatement le minuteur
>>>>>>> 674c77ed34e1c47deb521db74c8ed3e699ddb6ba
    }
  }

  // Chargement des informations utilisateur
  loadUserSession(): void {
    this.authService.getUserSession().subscribe(
      (response) => {
        this.user = response;
        this.userId = response.user_id;
        this.isLoading = false;
        console.log('Session utilisateur chargée:', this.user);
      },
      (error) => {
        console.error(
          'Erreur lors de la récupération de la session utilisateur:',
          error
        );
        if (error.status === 401) {
          this.router.navigate(['/login-page']);
        }
      }
    );
  }

  loadSessionDetails(): void {
    this.sessionService.getSessionById(this.sessionId).subscribe({
      next: async (response: any) => {
        if (response && response.video_url) {
          this.videoUrl = `/videos/${response.video_url}`;
          console.log('Vidéo URL récupérée:', this.videoUrl);

          try {
            // Calculer la durée de la vidéo
            this.duration = await this.videoService.getVideoDuration(
              this.videoUrl
            );
            console.log('Durée de la vidéo récupérée :', this.duration);

            // Envoyer la durée au backend pour la stocker dans Redis
            this.sessionService
              .storeVideoDuration(this.sessionId, this.duration)
              .subscribe({
                next: () => {
                  console.log('Durée de la vidéo stockée dans Redis.');
                },
                error: (error) => {
                  console.error(
                    'Erreur lors du stockage de la durée dans Redis:',
                    error
                  );
                },
              });
          } catch (error) {
            console.error(
              'Erreur lors de la récupération de la durée de la vidéo :',
              error
            );
            alert('Impossible de récupérer la durée de la vidéo.');
          }
        } else {
          console.error(
            'URL de la vidéo introuvable dans la réponse de la session.'
          );
        }
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement de la session:', error);
      },
    });
  }

  loadSessionInfo(): void {
    this.sessionService.getSessionById(this.sessionId).subscribe({
      next: (response) => {
        // Récupération des détails de la session
        console.log('Détails de la session récupérés :', response);
        this.videoUrl = `/videos/${response.video_url}`; // Chargez l'URL de la vidéo
        this.sessionName = response.session_name; // Nom de la session
        this.sessionDescription = response.description; // Description de la session
        this.sessionStatus = response.status; // Statut de la session
        // Récupérer la durée de la vidéo
        // this.videoService.getVideoDuration(this.videoUrl).then(
        //   (duration) => {
        //     console.log(`Durée de la vidéo : ${duration} secondes`);
        //   },
        console.log('Informations de session chargées:', response);
      },
      error: (error) => {
        console.error(
          'Erreur lors du chargement des détails de la session :',
          error
        );
        alert('Impossible de charger les informations de la session.');
      },
    });
  }

  // Charger les segments associés à la session
  // loadSegments(): void {
  //   this.sessionService.getSegmentsWithSession(this.sessionId).subscribe({
  //     next: (response) => {
  //       this.segments = response.segments; // Adaptez si la structure diffère
  //       console.log('Segments chargés pour la session :', this.segments);
  //     },
  //     error: (error) => {
  //       console.error('Erreur lors du chargement des segments :', error);
  //       alert('Impossible de charger les segments pour cette session.');
  //     },
  //   });
  // }

  // loadSegments(): void {
  //   this.sessionService.getSegmentsWithSession(this.sessionId).subscribe({
  //     next: (response) => {
  //       this.segments = response.segments.map((segment: any) => ({
  //         ...segment,
  //         subtitleText: '', // Initialisation locale pour la saisie
  //       }));
  //       console.log('Segments chargés :', this.segments);

  //       // Démarrer les timers pour chaque segment
  //     this.startTimers();
  //     },
  //     error: (error) => {
  //       console.error('Erreur lors du chargement des segments :', error);
  //     },
  //   });
  // }
  loadSegments(): void {
    this.sessionService.getSegmentsWithSession(this.sessionId).subscribe({
      next: (response) => {
        if (!response.segments || response.segments.length === 0) {
          console.warn('Aucun segment assigné à cet utilisateur.');
          alert('Aucun segment ne vous est assigné dans cette session.');
          this.segments = [];
          return;
        }

        this.segments = this.mergeSort(response.segments).map(
          (segment: any) => {
            const duration = this.calculateDurationInSeconds(
              segment.start_time,
              segment.end_time
            );

            return {
              ...segment,
              subtitleText: '',
              timeRemaining: duration,
              timer: null,
              isDisabled: false, // toujours false
              assigned_to: segment.assigned_to || 'Utilisateur inconnu',
              subtitles: segment.subtitles || [],
            };
          }
        );

        console.log('Segments chargés avec timers :', this.segments);
<<<<<<< HEAD
        
=======
        this.startTimers();
>>>>>>> 674c77ed34e1c47deb521db74c8ed3e699ddb6ba
      },
      error: (error) => {
        console.error('Erreur lors du chargement des segments :', error);
        alert('Erreur lors du chargement des segments. Veuillez réessayer.');
      },
    });
  }

  calculateDurationInSeconds(startTime: string, endTime: string): number {
    const [startHours, startMinutes, startSeconds] = startTime
      .split(':')
      .map(Number);
    const [endHours, endMinutes, endSeconds] = endTime.split(':').map(Number);

    // Convertir les heures, minutes et secondes en secondes totales
    const startTotalSeconds =
      startHours * 3600 + startMinutes * 60 + startSeconds;
    const endTotalSeconds = endHours * 3600 + endMinutes * 60 + endSeconds;

    // Retourner la différence en secondes
    return endTotalSeconds - startTotalSeconds;
  }

  // startTimers(): void {
  //   const globalStartTime = Date.now(); // Référence commune
  //   console.log(
  //     '🕒 Démarrage global des timers à',
  //     new Date(globalStartTime).toISOString()
  //   );

  //   this.segments.forEach((segment, index) => {
  //     const startDelay = this.timeStringToSeconds(segment.start_time) * 1000; // delay en ms
  //     const duration = this.calculateDurationInSeconds(
  //       segment.start_time,
  //       segment.end_time
  //     );

  //     // Timer de début basé sur le moment global
  //     setTimeout(() => {
  //       console.log(`🚀 Démarrage du segment ${segment.segment_id}`);
  //       segment.timeRemaining = duration;

  //       segment.timer = setInterval(() => {
  //         if (segment.timeRemaining > 0) {
  //           segment.timeRemaining--;
  //         } else {
  //           clearInterval(segment.timer);
  //           this.autoSaveSubtitle(segment); // Sauvegarde automatique
  //           console.log(`✅ Fin du segment ${segment.segment_id}`);
  //         }
  //       }, 1000);
  //     }, startDelay);
  //   });
  // }
  startTimers(): void {
<<<<<<< HEAD
    
    this.segments.forEach((segment) => {
      const delayBeforeStart =
        this.timeStringToSeconds(segment.start_time) * 1000;
  
      setTimeout(() => {
        console.log(`🟢 Timer lancé pour le segment ${segment.segment_id}`);
  
        segment.timer = setInterval(() => {
          if (segment.timeRemaining > 0) {
            segment.timeRemaining--;
            this.cdr.detectChanges();
          } else {
            clearInterval(segment.timer);
            this.autoSaveSubtitle(segment);
            this.cdr.detectChanges();
=======
    const globalStart = Date.now(); // Horodatage de démarrage local

    this.segments.forEach((segment, index) => {
      const delayBeforeStart =
        this.timeStringToSeconds(segment.start_time) * 1000;

      setTimeout(() => {
        // Lancer le timer uniquement si l'utilisateur est assigné à ce segment
        console.log(`🟢 Timer lancé pour le segment ${segment.segment_id}`);

        segment.timer = setInterval(() => {
          if (segment.timeRemaining > 0) {
            segment.timeRemaining--;
          } else {
            clearInterval(segment.timer);
            this.autoSaveSubtitle(segment);
>>>>>>> 674c77ed34e1c47deb521db74c8ed3e699ddb6ba
          }
        }, 1000);
      }, delayBeforeStart);
    });
  }
<<<<<<< HEAD
  

  startGlobalTimer(): void {
    const now = Date.now();
    const delay = Math.max(0, this.officialStartTime - now);
  
    console.log(`⏱️ Délai avant démarrage global: ${delay}ms`);
  
    setTimeout(() => {
      console.log(`⏱️ Flux officiellement lancé !`);
      this.startTimers();
  
      // Nettoyage si un ancien interval est déjà là
      if (this.signalUpdateInterval) {
        clearInterval(this.signalUpdateInterval);
      }
  
      // Démarrage de l'interval
      this.signalUpdateInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.officialStartTime) / 1000);
        this.elapsedTime = elapsed;
        this.updateSignalStatus();
  
        // Arrêt automatique quand tous les segments sont terminés
        const allSegmentsDone = this.segments.every(s => s.timeRemaining <= 0);
        if (allSegmentsDone) {
          console.log('🛑 Tous les segments sont terminés, arrêt du signal update.');
          clearInterval(this.signalUpdateInterval);
          this.signalUpdateInterval = null;
        }
      }, 1000);
    }, delay);
  }
  
=======

>>>>>>> 674c77ed34e1c47deb521db74c8ed3e699ddb6ba
  autoSaveSubtitle(segment: any): void {
    console.log(
      `Texte saisi pour le segment ${segment.segment_id} :`,
      segment.subtitleText
    );

    if (segment.subtitleText.trim() !== '') {
      this.sessionService
        .addSubtitle(segment.segment_id, segment.subtitleText, this.userId)
        .subscribe({
          next: (response) => {
            console.log(
              `Réponse du backend pour le segment ${segment.segment_id} :`,
              response
            );

            // Ajoute ici un log pour vérifier si `response.subtitle` est correct
            if (response && response.subtitle) {
              console.log(
                'Sous-titre sauvegardé avec succès :',
                response.subtitle
              );

              // Mets à jour `segment.subtitles`
              segment.subtitles.push({
                text: response.subtitle.text,
                created_by: this.userId,
                created_at: response.subtitle.created_at,
              });

              console.log(
                `Sous-titres actuels pour le segment ${segment.segment_id} :`,
                segment.subtitles
              );
            } else {
              console.error(
                `Problème dans la réponse du backend pour le segment ${segment.segment_id}.`
              );
            }

            // Réinitialise la zone de texte
            segment.subtitleText = '';
          },
          error: (error) => {
            console.error(
              `Erreur lors de la sauvegarde pour le segment ${segment.segment_id} :`,
              error
            );
          },
        });
    } else {
      console.log(
        `Aucun texte à sauvegarder pour le segment ${segment.segment_id}.`
      );
    }
  }

  calculateWaveWidth(
    timeRemaining: number,
    endTime: string,
    startTime: string
  ): string {
    const totalDuration = this.calculateDurationInSeconds(startTime, endTime);
    const percentage = ((totalDuration - timeRemaining) / totalDuration) * 100;
    return `${percentage}%`; // Renvoie la largeur en pourcentage
  }

  mergeSort(array: any[]): any[] {
    if (array.length <= 1) {
      return array; // Rien à trier si la liste contient un seul élément
    }

    const middle = Math.floor(array.length / 2); // Division au milieu
    const left = this.mergeSort(array.slice(0, middle)); // Récursion pour la moitié gauche
    const right = this.mergeSort(array.slice(middle)); // Récursion pour la moitié droite

    return this.merge(left, right); // Fusion des deux moitiés triées
  }

  merge(left: any[], right: any[]): any[] {
    const result = [];
    let i = 0,
      j = 0;

    while (i < left.length && j < right.length) {
      // Convertir start_time en secondes pour comparer
      const leftStartTime = this.convertTimeToSeconds(left[i].start_time);
      const rightStartTime = this.convertTimeToSeconds(right[j].start_time);

      if (leftStartTime <= rightStartTime) {
        result.push(left[i++]);
      } else {
        result.push(right[j++]);
      }
    }

    // Ajouter les éléments restants
    return result.concat(left.slice(i)).concat(right.slice(j));
  }

  convertTimeToSeconds(time: string): number {
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  }

<<<<<<< HEAD
  //getCurrentVideoTime(): number {
    //if (this._videoReady && this.videoRef?.nativeElement) {
    //  return this.videoRef.nativeElement.currentTime;
   // } else {
    //  console.warn('⏳ Vidéo pas encore prête');
    //  return 0;
   // }
  //}


  
  
  
  
  
  //isWaiting(segment: any): boolean {
    //const now = this.getCurrentVideoTime();
   // const start = this.timeStringToSeconds(segment.start_time);
   // return now < start - 5;
  //}
  
  //(segment: any): boolean {
   // const now = this.getCurrentVideoTime();
  //  const start = this.timeStringToSeconds(segment.start_time);
  //  return start - now <= 5 && now < start;
 // }
  
  //isCurrentTurn(segment: any): boolean {
   // const now = this.getCurrentVideoTime();
   // const start = this.timeStringToSeconds(segment.start_time);
   // const end = this.timeStringToSeconds(segment.end_time);
   // return now >= start && now <= end;
  //}
  
  
  

=======
>>>>>>> 674c77ed34e1c47deb521db74c8ed3e699ddb6ba
  // // Normaliser le texte des sous-titres (supprime espaces inutiles, etc.)
  // normalizeSubtitle(text: string): string {
  //   // Supprime les espaces multiples et normalise le texte
  //   return text
  //     .trim()
  //     .replace(/\s+/g, ' ') // Réduit les espaces multiples à un seul espace
  //     .replace(/[^\p{L}\p{N}\s\p{P}]/gu, ''); // Autorise lettres, chiffres, espaces et ponctuation
  // }

  // // Ajuster les sous-titres à la durée du segment
  // adjustSubtitleToSegment(segment: any): string {
  //   const words = segment.subtitleText.split(' ');
  //   const maxWords = Math.floor(segment.timeRemaining / 2); // Exemple : 2 mots par seconde

  //   // Ajuste la longueur du texte sans retourner un résultat vide
  //   const adjustedText = words.slice(0, maxWords).join(' ');

  //   // Si aucun mot n'est sélectionné, retournez le texte original avec "..."
  //   return adjustedText.trim() === ''
  //     ? segment.subtitleText + '...'
  //     : adjustedText;
  // }

  // Compiler les sous-titres en une sortie finale (exemple pour SRT)
  compileFinalSubtitles(): string {
    console.log(
      'Compilation des sous-titres finaux. Segments :',
      this.segments
    );

    return this.segments
      .filter((segment) => segment.subtitles.length > 0)
      .map((segment) => {
        const combinedText = segment.subtitles
          .map((s: { text: any }) => s.text)
          .join(' ');
        console.log(
          `Segment ${segment.segment_id} : Texte combiné :`,
          combinedText
        );

        return `${segment.start_time} --> ${segment.end_time}\n${combinedText}`;
      })
      .join('\n\n');
  }

  formatTimeToSRT(time: number): string {
    if (isNaN(time)) {
      console.error(
        'Erreur : timestamp invalide détecté dans formatTimeToSRT:',
        time
      );
      return '00:00:00,000'; // Retourne un timestamp par défaut au lieu de NaN
    }

    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
      2,
      '0'
    )}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(
      3,
      '0'
    )}`;
  }
  timeStringToSeconds(timeString: string): number {
    const parts = timeString.split(':'); // Séparer HH, MM, SS
    if (parts.length < 3) {
      console.error('Format de temps invalide :', timeString);
      return 0;
    }

    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = parseFloat(parts[2]) || 0; // Accepte les millisecondes

    return hours * 3600 + minutes * 60 + seconds;
  }
  // Exporter les sous-titres au format SRT
  exportToSRT(): string {
    console.log('Segments avant génération du fichier SRT :', this.segments);

    let subtitleIndex = 1;
    const minFirstSegmentDuration = 10; // Forcer une durée de 10 secondes pour le premier segment
    const minSubtitleDuration = 2; // Un sous-titre reste au moins 2 secondes
    const maxCPS = 12; // 12 caractères/seconde pour une meilleure lisibilité
    const maxVisibleLines = 3; // Max 3 lignes visibles en même temps

    return this.segments
      .filter((segment) => segment.subtitles.length > 0)
      .map((segment, segmentIndex) => {
        const fullText = segment.subtitles
          .map((s: { text: string }) => s.text)
          .join(' ');

        console.log(
          `Sous-titres pour le segment ${segment.segment_id} :`,
          fullText
        );

        let startTime = this.timeStringToSeconds(segment.start_time);
        let endTime = this.timeStringToSeconds(segment.end_time);

        if (isNaN(startTime) || isNaN(endTime) || startTime === endTime) {
          console.error(
            `⚠️ Erreur : start_time (${startTime}) et end_time (${endTime}) invalides pour le segment ${segment.segment_id}`
          );
          endTime = startTime + 1;
        }

        // Forcer le premier segment à durer au moins 10s
        if (
          segmentIndex === 0 &&
          endTime - startTime < minFirstSegmentDuration
        ) {
          endTime = startTime + minFirstSegmentDuration;
        }

        const sanitizedText = fullText.replace(/[\r\n]+/g, ' ').trim();
        const words = sanitizedText.split(' ');
        const maxLineLength = 40;
        const lines: string[] = [];
        let currentLine = '';

        words.forEach((word: string) => {
          if ((currentLine + word).length <= maxLineLength) {
            currentLine += word + ' ';
          } else {
            lines.push(currentLine.trim());
            currentLine = word + ' ';
          }
        });

        if (currentLine.trim() !== '') {
          lines.push(currentLine.trim());
        }

        console.log(
          `Sous-titres découpés pour le segment ${segment.segment_id} :`,
          lines
        );

        // Durée totale du segment
        let segmentDuration = endTime - startTime;
        let idealDuration = sanitizedText.length / maxCPS;
        let adjustedDuration = Math.max(
          minSubtitleDuration,
          Math.min(segmentDuration, idealDuration)
        );

        if (segmentIndex === 0 && adjustedDuration < minFirstSegmentDuration) {
          adjustedDuration = minFirstSegmentDuration;
        }

        const lineDuration = Math.max(
          minSubtitleDuration,
          adjustedDuration / lines.length
        );
        let visibleLines: string[] = []; // Stocke les lignes affichées progressivement

        // Génération des sous-titres en affichage progressif
        const srtBlocks = lines.map((line, i) => {
          const blockStartTime = startTime + i * lineDuration;
          const blockEndTime = Math.min(endTime, blockStartTime + lineDuration);

          // Ajout progressif des lignes à l'affichage
          visibleLines.push(line);
          if (visibleLines.length > maxVisibleLines) {
            visibleLines.shift(); // Supprime la plus ancienne ligne pour un effet de "défilement"
          }

          const formattedStartTime = this.formatTimeToSRT(blockStartTime);
          const formattedEndTime = this.formatTimeToSRT(blockEndTime);

          const blockText = visibleLines.join('\n'); // Afficher les lignes empilées
          const srtBlock = `${subtitleIndex}\n${formattedStartTime} --> ${formattedEndTime}\n${blockText}`;
          subtitleIndex++;

          return srtBlock;
        });

        return srtBlocks.join('\n\n');
      })
      .join('\n\n');
  }

  // Méthode pour déclencher le téléchargement
  downloadSubtitles(): void {
    const srtContent = this.exportToSRT();
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtitles.srt';
    a.click();
    URL.revokeObjectURL(url);
  }

  onAllSegmentsComplete(): void {
    const finalSubtitles = this.exportToSRT();
    console.log('✅ Sous-titres générés :', finalSubtitles);

    if (!finalSubtitles.trim()) {
      console.error('❌ Aucun sous-titre généré ! Vérifie la saisie.');
      return;
    }

    // Sauvegarder le fichier .srt localement (stocké temporairement dans localStorage)
    localStorage.setItem('srtFile', finalSubtitles);

    // Redirection vers Streaming avec l'ID de session
    this.router.navigate(['/streaming', this.sessionId]);
  }

  connectToSocket(): void {
    console.log('Rejoint la session via Socket.IO :', {
      session_id: this.sessionId,
      user_id: this.userId,
      username: this.user?.username,
    });

    // Écouter les événements du serveur
    this.socketService.onUserJoined().subscribe((user) => {
      this.collaborators += 1;
      console.log(`${user.userName} a rejoint la session.`);
    });

    this.socketService.onUserLeft().subscribe((user) => {
      this.collaborators -= 1;
      console.log(`${user.userName} a quitté la session.`);
    });

    // Abonnement aux mises à jour des utilisateurs connectés
    this.socketService.onUsersUpdated().subscribe((users: string[]) => {
      this.users = users; // Met à jour la liste des utilisateurs
      console.log('Liste mise à jour des utilisateurs connectés :', this.users);
    });

    // Abonnement aux mises à jour des segments redistribués
    this.socketService
      .onSegmentsRedistributed()
      .subscribe((segments: any[]) => {
        this.segments = segments; // Met à jour la liste des segments
        console.log('Segments redistribués reçus :', this.segments);
      });
    // Abonnement aux mises à jour des utilisateurs
    this.socketService.getUsers().subscribe((users) => {
      this.users = users;
      console.log('Utilisateurs connectés à la session :', this.users);
    });

    // Abonnement aux mises à jour des segments redistribués
    this.socketService.onSegmentsUpdated().subscribe((data) => {
      console.log('Mise à jour des segments reçue :', data);
      if (data.segments) {
        this.segments = data.segments; // Met à jour les segments affichés
      }
    });
<<<<<<< HEAD

    this.socketService.onStreamStarted().subscribe(({ startTime }) => {
      this.officialStartTime = startTime;
      console.log('📡 Flux démarré à', new Date(startTime));
    
      this.streamStarted = true;
      this.startGlobalTimer();
    });
    
    
    
    
    
    this.socketService.onElapsedTime().subscribe(({ elapsedTime }) => {
      this.elapsedTime = elapsedTime;
    });
    
  }

  startTimersFromElapsed(elapsed: number): void {
    this.segments.forEach((segment) => {
      const segmentStart = this.timeStringToSeconds(segment.start_time);
      const segmentEnd = this.timeStringToSeconds(segment.end_time);
      const duration = segmentEnd - segmentStart;
  
      // Si le segment a déjà fini, on ne le lance pas
      if (elapsed >= segmentEnd) return;
  
      const delay = Math.max((segmentStart - elapsed) * 1000, 0);
  
      segment.timeRemaining = segmentEnd - Math.max(elapsed, segmentStart);
  
      setTimeout(() => {
        console.log(`🚀 Timer lancé pour le segment ${segment.segment_id}`);
        segment.timer = setInterval(() => {
          if (segment.timeRemaining > 0) {
            segment.timeRemaining--;
          } else {
            clearInterval(segment.timer);
            this.autoSaveSubtitle(segment);
          }
        }, 1000);
      }, delay);
    });
  }
  
=======
  }

>>>>>>> 674c77ed34e1c47deb521db74c8ed3e699ddb6ba
  // Gérer une erreur de chargement vidéo
  onVideoError(): void {
    console.error('La vidéo ne peut pas être chargée :', this.videoUrl);
    alert(
      'Impossible de charger la vidéo. Vérifiez son chemin ou sa disponibilité.'
    );
  }
  // Envoyer un sous-titre via le socket
  onSubtitleChange() {
    const timestamp = Date.now();
    this.socketService.sendSubtitle({
      text: this.subtitleText,
      videoId: this.videoUrl,
      timestamp,
    });
  }

  ngOnDestroy() {
<<<<<<< HEAD
    if (this.signalUpdateInterval) {
      clearInterval(this.signalUpdateInterval);
      this.signalUpdateInterval = null;
    }  
=======
>>>>>>> 674c77ed34e1c47deb521db74c8ed3e699ddb6ba
    this.socketService.leaveVideoSession({
      userId: this.userId,
      sessionId: this.sessionId,
    });
  }

  // Déconnexion utilisateur
  onLogout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login-page']);
      },
      error: (error) => {
        console.error('Erreur lors de la déconnexion:', error);
      },
    });
  }
<<<<<<< HEAD


  updateSignalStatus(): void {
    const username = (this.username || '').toLowerCase().trim(); 
    const now = this.elapsedTime; // Temps écoulé depuis le début de la session
  
    //  Détection du segment actif (utilisateur doit sous-titrer maintenant)
    this.activeSegment = this.segments.find((s) => {
      const assignedTo = (s.assigned_to || '').toLowerCase().trim();
      const start = this.timeStringToSeconds(s.start_time);
      const end = this.timeStringToSeconds(s.end_time);
      return assignedTo === username && now >= start && now <= end;
    });
  
    //  Détection du prochain segment imminent (dans moins de 6 secondes)
    this.nextSegment = this.segments.find((s) => {
      const assignedTo = (s.assigned_to || '').toLowerCase().trim();
      const start = this.timeStringToSeconds(s.start_time);
      const timeBeforeStart = start - now;
  
      return (
        assignedTo === username &&
        !isNaN(timeBeforeStart) &&
        timeBeforeStart > 0 &&
        timeBeforeStart <= 6
      );
    });
  
    // 🔄 Forcer l’actualisation de l’affichage (si nécessaire)
    this.cdRef.detectChanges();
  }
  
  
// Signaux 

getCurrentSignal(): 'green' | 'orange' | 'red' {
  const username = (this.username || '').toLowerCase().trim();
  const now = this.elapsedTime;

  // 🔒 Sécurité : tant que la session n'est pas officiellement lancée, on force le rouge
  if (!this.streamStarted || !this.officialStartTime || now === 0) {
    return 'red';
  }

  // Cas 1 : l'utilisateur est en train de sous-titrer (signal vert)
  const isActive = this.segments.some((s) => {
    const start = this.timeStringToSeconds(s.start_time);
    const end = this.timeStringToSeconds(s.end_time);
    return (
      s.assigned_to?.toLowerCase().trim() === username &&
      now >= start &&
      now <= end
    );
  });

  if (isActive) return 'green';

  // Cas 2 : l'utilisateur commence bientôt (signal orange)
  const isSoon = this.segments.some((s) => {
    const start = this.timeStringToSeconds(s.start_time);
    const timeBeforeStart = start - now;
    return (
      s.assigned_to?.toLowerCase().trim() === username &&
      timeBeforeStart > 0 &&
      timeBeforeStart <= 5
    );
  });

  if (isSoon) return 'orange';

  return 'red';
}


getNextSegment(): any {
  return this.nextSegment;
}

=======
>>>>>>> 674c77ed34e1c47deb521db74c8ed3e699ddb6ba
}
