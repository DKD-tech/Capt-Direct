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
import test from 'node:test';
import { ChangeDetectorRef } from '@angular/core';
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
  isAuthenticated: boolean = false;
  isLoading = true;
  subtitleText = '';
  displayedSubtitle = '';
  userId: number = 0; // Identifiant utilisateur récupéré dynamiquement
  videoUrl = ''; // URL de la vidéo récupérée dynamiquement
  sessionId: number = 8; // ID de la session à afficher
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
  currentSegment: any = null; // Stocke le segment actif
  globalSubtitleText: string = ''; // Contient le texte en cours d'écriture
  isTyping: any;

  constructor(
    private socketService: SocketService,
    private authService: AuthService,
    private router: Router,
    private sessionService: SessionService,
    private videoService: VideoService,
    private SubtitleService: SubtitleService,
    private cdr: ChangeDetectorRef
  ) {}

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
    this.socketService.onSubtitleUpdate().subscribe((data) => {
      this.displayedSubtitle = data.text; // Met à jour l'affichage en direct
    });
  }

  onGlobalSubtitleChange() {
    if (this.currentSegment) {
      this.currentSegment.subtitleText = this.globalSubtitleText;
    }
  }

  updateCurrentSegment() {
    this.currentSegment =
      this.segments.find(
        (segment) =>
          segment.assigned_to === this.user?.username &&
          segment.timeRemaining > 0
      ) || null;

    // Si un segment actif est trouvé, on récupère son texte
    if (this.currentSegment) {
      this.globalSubtitleText = this.currentSegment.subtitleText || '';
    } else {
      this.globalSubtitleText = '';
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

  loadSegments(): void {
    this.sessionService.getSegmentsWithSession(this.sessionId).subscribe({
      next: (response) => {
        this.segments = this.mergeSort(response.segments).map(
          (segment: any) => {
            // Calcul de la durée en secondes
            const duration = this.calculateDurationInSeconds(
              segment.start_time,
              segment.end_time
            );

            return {
              ...segment,
              subtitleText: '', // Texte en cours de saisie
              timeRemaining: duration, // Temps restant pour le segment
              timer: null, // Référence au timer pour arrêter si nécessaire
              isDisabled: false, // Indique si la saisie est désactivée
              assigned_to: segment.assigned_to || 'Utilisateur inconnu', // Nom de l'utilisateur assigné
            };
          }
        );

        console.log('Segments chargés avec timers :', this.segments);

        // Démarrer les timers
        this.startTimers();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des segments :', error);
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
  getUserStatusClass(): string {
    if (!this.currentSegment) return 'status-waiting'; // Aucun segment actif

    if (this.currentSegment.assigned_to === this.user?.username) {
      if (this.isTyping) {
        return 'status-typing'; // L'utilisateur est en train d'écrire
      }
      return 'status-active'; // L'utilisateur est en cours
    }

    // Vérifier si l'utilisateur a un segment qui arrive bientôt
    const userSegments = this.segments.filter(
      (seg) => seg.assigned_to === this.user?.username
    );
    const userCurrentIndex = userSegments.findIndex(
      (seg) => seg.segment_id === this.currentSegment.segment_id
    );

    if (userCurrentIndex !== -1 && userCurrentIndex + 1 < userSegments.length) {
      return 'status-soon'; // Son segment arrive bientôt
    }

    return 'status-waiting'; // En attente
  }

  getUserStatusText(): string {
    if (!this.currentSegment) return '🔴 En attente'; // Aucun segment actif

    if (this.currentSegment.assigned_to === this.user?.username) {
      if (this.isTyping) {
        return "⌨️ En train d'écrire...";
      }
      return '🟢 En cours';
    }

    // Vérifier si l'utilisateur a un segment qui arrive bientôt
    const userSegments = this.segments.filter(
      (seg) => seg.assigned_to === this.user?.username
    );
    const userCurrentIndex = userSegments.findIndex(
      (seg) => seg.segment_id === this.currentSegment.segment_id
    );

    if (userCurrentIndex !== -1 && userCurrentIndex + 1 < userSegments.length) {
      return '🟠 Bientôt à vous';
    }

    return '🔴 En attente';
  }

  startTimers(): void {
    this.startSegmentTimer(0); // Démarre le premier segment
  }

  startSegmentTimer(index: number): void {
    if (index >= this.segments.length) {
      console.log('✅ Tous les segments ont été joués.');
      this.onAllSegmentsComplete();
      return;
    }

    this.currentSegment = this.segments[index];
    console.log(
      `🎬 Démarrage du segment ${this.currentSegment.segment_id} pour ${this.currentSegment.assigned_to}`
    );

    const startTime = this.timeStringToSeconds(this.currentSegment.start_time);
    const endTime = this.timeStringToSeconds(this.currentSegment.end_time);

    if (isNaN(startTime) || isNaN(endTime) || endTime <= startTime) {
      console.error(`❌ Erreur: start_time ou end_time invalide`);
      return;
    }

    this.currentSegment.timeRemaining = endTime - startTime;
    this.globalSubtitleText = this.currentSegment.subtitleText || '';

    this.currentSegment.timer = setInterval(() => {
      if (this.currentSegment.timeRemaining > 0) {
        this.currentSegment.timeRemaining--;
      } else {
        clearInterval(this.currentSegment.timer);
        console.log(`⏳ Fin du segment ${this.currentSegment.segment_id}`);

        // ✅ Attendre un peu avant de passer au segment suivant
        setTimeout(() => {
          this.autoSaveSubtitle(() => {
            this.moveToNextSegment(index + 1);
          });
        }, 500);
      }
    }, 1000);
  }

  autoSaveSubtitle(nextSegmentCallback?: () => void): void {
    if (!this.currentSegment) {
      console.log('Aucun segment actif, pas de sauvegarde.');
      return;
    }

    console.log(
      `💾 Sauvegarde automatique pour ${this.currentSegment.segment_id}`
    );

    if (this.globalSubtitleText.trim() === '') {
      this.globalSubtitleText = `Utilisateur ${this.userId} : Pas de transcription`;
    }

    this.sessionService
      .addSubtitle(
        this.currentSegment.segment_id,
        this.globalSubtitleText,
        this.userId
      )
      .subscribe({
        next: (response) => {
          console.log(`✅ Réponse du backend :`, response);

          if (response && response.subtitle) {
            this.currentSegment.subtitles.push({
              text: response.subtitle.text,
              created_by: this.userId,
              created_at: response.subtitle.created_at,
            });

            this.currentSegment.isDisabled = true;
            this.globalSubtitleText = ''; // Réinitialisation

            // ✅ Assure que le passage au segment suivant ne se fait qu’après l’enregistrement
            if (nextSegmentCallback) {
              setTimeout(nextSegmentCallback, 500);
            }
          }
        },
        error: (error) => {
          console.error(`❌ Erreur de sauvegarde :`, error);
        },
      });
  }

  moveToNextSegment(nextIndex: number): void {
    if (nextIndex >= this.segments.length) {
      console.log('✅ Tous les segments sont terminés.');

      // ✅ Attendre un petit instant avant la redirection
      setTimeout(() => {
        this.currentSegment = null;
        this.router.navigate(['/streaming', this.sessionId]);
      }, 1000);

      return;
    }

    this.currentSegment = this.segments[nextIndex];
    this.globalSubtitleText = this.currentSegment.subtitleText || '';

    console.log(
      `➡️ Passage au segment suivant: ${this.currentSegment.segment_id} pour ${this.currentSegment.assigned_to}`
    );

    // ✅ Démarre le timer pour le segment suivant
    setTimeout(() => this.startSegmentTimer(nextIndex), 500);
  }

  // autoSaveSubtitle(): void {
  //   if (!this.currentSegment) {
  //     console.log('Aucun segment actif, pas de sauvegarde.');
  //     return;
  //   }

  //   console.log(
  //     `💾 Sauvegarde automatique pour le segment ${this.currentSegment.segment_id}`
  //   );

  //   if (this.globalSubtitleText.trim() !== '') {
  //     this.sessionService
  //       .addSubtitle(
  //         this.currentSegment.segment_id,
  //         this.globalSubtitleText,
  //         this.userId
  //       )
  //       .subscribe({
  //         next: (response) => {
  //           console.log(`✅ Réponse du backend :`, response);

  //           if (response && response.subtitle) {
  //             this.currentSegment.subtitles.push({
  //               text: response.subtitle.text,
  //               created_by: this.userId,
  //               created_at: response.subtitle.created_at,
  //             });

  //             this.currentSegment.isDisabled = true;

  //             console.log(
  //               `📌 Sous-titres actuels du segment ${this.currentSegment.segment_id} :`,
  //               this.currentSegment.subtitles
  //             );

  //             // 🟢 Passage automatique au segment suivant après sauvegarde
  //             this.globalSubtitleText = ''; // Réinitialise la zone de texte
  //             this.moveToNextSegment();
  //           }
  //         },
  //         error: (error) => {
  //           console.error(`❌ Erreur de sauvegarde :`, error);
  //         },
  //       });
  //   } else {
  //     console.log(`Aucun texte à sauvegarder.`);
  //   }
  // }

  // autoSaveSubtitle(segment: any): void {
  //   console.log(
  //     `Texte saisi pour le segment ${segment.segment_id} :`,
  //     segment.subtitleText
  //   );

  //   if (segment.subtitleText.trim() !== '') {
  //     this.sessionService
  //       .addSubtitle(segment.segment_id, segment.subtitleText, this.userId)
  //       .subscribe({
  //         next: (response) => {
  //           console.log(
  //             `Réponse du backend pour le segment ${segment.segment_id} :`,
  //             response
  //           );

  //           // Ajoute ici un log pour vérifier si `response.subtitle` est correct
  //           if (response && response.subtitle) {
  //             console.log(
  //               'Sous-titre sauvegardé avec succès :',
  //               response.subtitle
  //             );

  //             // Mets à jour `segment.subtitles`
  //             segment.subtitles.push({
  //               text: response.subtitle.text,
  //               created_by: this.userId,
  //               created_at: response.subtitle.created_at,
  //             });

  //             // 🚀 Désactiver la saisie après validation
  //             segment.isDisabled = true;

  //             console.log(
  //               `Sous-titres actuels pour le segment ${segment.segment_id} :`,
  //               segment.subtitles
  //             );
  //           } else {
  //             console.error(
  //               `Problème dans la réponse du backend pour le segment ${segment.segment_id}.`
  //             );
  //           }

  //           // Réinitialise la zone de texte
  //           segment.subtitleText = '';
  //         },
  //         error: (error) => {
  //           console.error(
  //             `Erreur lors de la sauvegarde pour le segment ${segment.segment_id} :`,
  //             error
  //           );
  //         },
  //       });
  //   } else {
  //     console.log(
  //       `Aucun texte à sauvegarder pour le segment ${segment.segment_id}.`
  //     );
  //   }
  // }

  calculateWaveWidth(
    timeRemaining: number,
    endTime: string,
    startTime: string
  ): string {
    const totalDuration = this.calculateDurationInSeconds(startTime, endTime);
    const percentage = ((totalDuration - timeRemaining) / totalDuration) * 100;
    return `${percentage}%`; // Renvoie la largeur en pourcentage
  }

  onSubtitleInputChange(segment: any) {
    this.displayedSubtitle = segment.subtitleText; // Mise à jour en temps réel
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

    return this.segments
      .filter((segment) => segment.subtitles.length > 0) // Ne garde que les segments avec sous-titres
      .map((segment, index) => {
        const text = segment.subtitles
          .map((s: { text: any }) => s.text)
          .join(' ');
        console.log(
          `Sous-titres pour le segment ${segment.segment_id} :`,
          text
        );

        // Vérification des valeurs brutes des timestamps
        console.log(
          `start_time brut: ${segment.start_time}, end_time brut: ${segment.end_time}`
        );

        // Conversion correcte en secondes
        let startTime = this.timeStringToSeconds(segment.start_time);
        let endTime = this.timeStringToSeconds(segment.end_time);

        // Vérification des erreurs possibles
        if (isNaN(startTime) || isNaN(endTime) || startTime === endTime) {
          console.error(
            `⚠️ Erreur : start_time (${startTime}) et end_time (${endTime}) invalides pour le segment ${segment.segment_id}`
          );
          endTime = startTime + 1; // Évite que les sous-titres aient une durée de 0 secondes
        }

        return `${index + 1}
  ${this.formatTimeToSRT(startTime)} --> ${this.formatTimeToSRT(endTime)}
  ${text}`;
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
  }

  // Gérer une erreur de chargement vidéo
  onVideoError(): void {
    console.error('La vidéo ne peut pas être chargée :', this.videoUrl);
    alert(
      'Impossible de charger la vidéo. Vérifiez son chemin ou sa disponibilité.'
    );
  }
  // Envoyer un sous-titre via le socket
  onSubtitleChange(segment: any) {
    const timestamp = Date.now();
    this.socketService.sendSubtitle({
      text: segment.subtitleText,
      videoId: this.videoUrl,
      timestamp,
    });

    // Mettre à jour l'affichage localement
    this.displayedSubtitle = segment.subtitleText;
  }

  ngOnDestroy() {
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
}
