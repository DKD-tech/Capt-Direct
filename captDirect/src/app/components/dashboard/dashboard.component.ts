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
  sessionId: number = 14; // ID de la session à afficher
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
    private SubtitleService: SubtitleService
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

  startTimers(): void {
    let currentSegmentIndex = 0; // Démarrer par le premier segment

    const startSegmentTimer = (index: number) => {
      if (index >= this.segments.length) {
        console.log('Tous les segments ont été exécutés.');
        this.onAllSegmentsComplete();
        return; // Tous les segments ont été joués
      }

      const segment = this.segments[index];
      console.log(`Démarrage du timer pour le segment ${segment.segment_id}`);

      // Initialiser un timer pour le segment actuel
      segment.timer = setInterval(() => {
        if (segment.timeRemaining > 0) {
          segment.timeRemaining--;
        } else {
          // Sauvegarder automatiquement à la fin
          clearInterval(segment.timer);
          this.autoSaveSubtitle(segment);

          // Démarrer le timer du segment suivant
          startSegmentTimer(index + 1);
        }
      }, 1000); // Décompte toutes les secondes
    };

    // Démarrer le timer pour le premier segment
    startSegmentTimer(currentSegmentIndex);
  }

  // addSubtitleToSegment(segment: any): void {
  //   if (!segment.subtitleText || segment.subtitleText.trim() === '') {
  //     alert('Veuillez saisir un texte avant de l’enregistrer.');
  //     return;
  //   }

  //   this.sessionService
  //     .addSubtitle(segment.segment_id, segment.subtitleText, this.userId)
  //     .subscribe({
  //       next: (response) => {
  //         console.log('Sous-titre ajouté avec succès :', response);
  //         alert('Sous-titre ajouté avec succès.');

  //         // Réinitialiser la zone de texte après l’ajout
  //         segment.subtitleText = '';

  //         // Ajouter le sous-titre au tableau local pour affichage immédiat
  //         segment.subtitles.push({
  //           text: response.text,
  //           created_by: this.userId,
  //           created_at: new Date().toISOString(),
  //         });
  //       },
  //       error: (error) => {
  //         console.error('Erreur lors de l’ajout du sous-titre :', error);
  //         alert('Erreur lors de l’ajout du sous-titre.');
  //       },
  //     });
  // }

  autoSaveSubtitle(segment: any): void {
    // Normaliser et ajuster le texte
    segment.subtitleText = this.normalizeSubtitle(segment.subtitleText);
    console.log('Texte après normalisation :', segment.subtitleText);

    segment.subtitleText = this.adjustSubtitleToSegment(segment);
    console.log('Texte après ajustement :', segment.subtitleText);

    if (segment.subtitleText.trim() !== '') {
      // Ajoutez un log pour voir les données avant de les envoyer
      console.log(
        'Préparation de la sauvegarde automatique avec les données :',
        {
          segment_id: segment.segment_id,
          text: segment.subtitleText,
          created_by: this.userId,
        }
      );
      // Sauvegarder automatiquement le sous-titre s'il n'est pas vide
      this.sessionService
        .addSubtitle(segment.segment_id, segment.subtitleText, this.userId)
        .subscribe({
          next: (response) => {
            console.log(
              `Sous-titre sauvegardé automatiquement pour le segment ${segment.segment_id} :`,
              response
            );

            // Ajouter le sous-titre sauvegardé à la liste des sous-titres
            segment.subtitles.push({
              text: response.text,
              created_by: this.userId,
              created_at: new Date().toISOString(),
            });

            // Réinitialiser la zone de texte après la sauvegarde
            segment.subtitleText = '';
          },
          error: (error) => {
            console.error(
              `Erreur lors de la sauvegarde automatique pour le segment ${segment.segment_id} :`,
              error
            );
          },
        });
    } else {
      console.log(
        `Aucun texte à sauvegarder pour le segment ${segment.segment_id}.`
      );
    }

    // Désactiver la saisie pour ce segment
    segment.isDisabled = true;
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

  // Normaliser le texte des sous-titres (supprime espaces inutiles, etc.)
  normalizeSubtitle(text: string): string {
    // Supprime les espaces multiples et normalise le texte
    return text
      .trim()
      .replace(/\s+/g, ' ') // Réduit les espaces multiples à un seul espace
      .replace(/[^\p{L}\p{N}\s\p{P}]/gu, ''); // Autorise lettres, chiffres, espaces et ponctuation
  }

  // Ajuster les sous-titres à la durée du segment
  adjustSubtitleToSegment(segment: any): string {
    const words = segment.subtitleText.split(' ');
    const maxWords = Math.floor(segment.timeRemaining / 2); // Exemple : 2 mots par seconde

    // Ajuste la longueur du texte sans retourner un résultat vide
    const adjustedText = words.slice(0, maxWords).join(' ');

    // Si aucun mot n'est sélectionné, retournez le texte original avec "..."
    return adjustedText.trim() === ''
      ? segment.subtitleText + '...'
      : adjustedText;
  }

  // Compiler les sous-titres en une sortie finale (exemple pour SRT)
  compileFinalSubtitles(): string {
    return this.segments
      .filter((segment) => segment.subtitles.length > 0)
      .map(
        (segment) =>
          `${segment.start_time} --> ${segment.end_time}\n${segment.subtitleText}`
      )
      .join('\n\n');
  }

  // Exporter les sous-titres au format SRT
  exportToSRT(): string {
    return this.segments
      .map((segment, index) => {
        return `${index + 1}
${segment.start_time} --> ${segment.end_time}
${segment.subtitleText}`;
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
    const finalSubtitles = this.compileFinalSubtitles();
    console.log('Sous-titres finaux générés :', finalSubtitles);
    alert('Sous-titres finaux prêts. Vous pouvez les exporter.');
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
  onSubtitleChange() {
    const timestamp = Date.now();
    this.socketService.sendSubtitle({
      text: this.subtitleText,
      videoId: this.videoUrl,
      timestamp,
    });
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
