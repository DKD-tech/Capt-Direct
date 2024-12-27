import { VideoService } from './../../services/sessions/video.service';
import { AuthService } from './../../services/auth/auth.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SocketService } from '../../services/socket.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService } from '../../services/sessions/session.service';
import { CommonModule } from '@angular/common';
// import videojs from 'video.js';

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
  userId = ''; // Identifiant utilisateur récupéré dynamiquement
  videoUrl = ''; // URL de la vidéo récupérée dynamiquement
  sessionId: number = 6; // ID de la session à afficher
  segments: any[] = [];
  collaborators: number = 1; // Nombre de collaborateurs en ligne
  user: any;
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
    private videoService: VideoService
  ) {}

  ngOnInit() {
    this.loadUserSession();
    this.loadSessionDetails();
    this.connectToSocket();
    this.loadSessionInfo();
    // const videoElement = document.getElementById('liveVideo') as HTMLVideoElement;
    // videoElement.addEventListener('timeupdate', this.updateSubtitleDisplay.bind(this));
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

  // Chargement des informations de la session (vidéo et segments)
  // loadSessionDetails(): void {
  //   // Récupérer la session par ID (session 1 par défaut)
  //   this.sessionService.getSessionById(this.sessionId).subscribe({
  //     next: (response: any) => {
  //       if (response && response.video_url) {
  //         this.videoUrl = response.video_url; // Affecter la vidéo à afficher

  //         console.log('Vidéo URL récupérée:', this.videoUrl);
  //         // Charger la durée de la vidéo après avoir défini son URL
  //         // this.loadVideoDuration();
  //         // this.loadSegments(); // Charger les segments après avoir récupéré la vidéo
  //       } else {
  //         console.error(
  //           'URL de la vidéo introuvable dans la réponse de la session.'
  //         );
  //       }
  //     },
  //     error: (error: any) => {
  //       console.error('Erreur lors du chargement de la session:', error);
  //     },
  //   });
  // }

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
  // loadSessionDetails(): void {
  //   this.sessionService.getSessionById(this.sessionId).subscribe({
  //     next: (response: any) => {
  //       if (response && response.video_url) {
  //         this.videoUrl = `/videos/${response.video_url}`;
  //         console.log('Vidéo URL récupérée:', this.videoUrl);

  //         // Lancer le streaming en demandant au backend
  //         this.sessionService.startStreaming(this.sessionId).subscribe({
  //           next: () => {
  //             console.log('Streaming démarré avec succès.');
  //           },
  //           error: (error) => {
  //             console.error('Erreur lors du démarrage du streaming :', error);
  //           },
  //         });
  //       } else {
  //         console.error(
  //           'URL de la vidéo introuvable dans la réponse de la session.'
  //         );
  //       }
  //     },
  //     error: (error: any) => {
  //       console.error('Erreur lors du chargement de la session:', error);
  //     },
  //   });
  // }

  // onTimeUpdate(event: Event): void {
  //   const videoElement = event.target as HTMLVideoElement;
  //   const currentTime = videoElement.currentTime;

  //   const currentSubtitle = this.subtitleService.getSubtitleForTime(currentTime);
  //   if (currentSubtitle) {
  //     this.displayedSubtitle = currentSubtitle.text;

  //     // Respecter les durées minimum et maximum
  //     const duration = currentSubtitle.endTime - currentSubtitle.startTime;
  //     if (duration < 1) {
  //       console.warn('Sous-titre trop court, ajustement requis');
  //     } else if (duration > 10) {
  //       console.warn('Sous-titre trop long, ajustement requis');
  //     }
  //   } else {
  //     this.displayedSubtitle = '';
  //   }
  // }

  // onSubtitleInput(event: Event): void {
  //   const inputElement = event.target as HTMLTextAreaElement;
  //   const subtitleText = inputElement.value;

  //   // Obtenir le temps actuel de la vidéo
  //   const videoElement = document.getElementById('liveVideo') as HTMLVideoElement;
  //   const currentTime = videoElement.currentTime;

  //   // Envoyer au backend via Socket.io
  //   this.socket.emit('updateSubtitle', {
  //     segment_id: this.currentSegmentId, // ID du segment
  //     text: subtitleText,
  //     time: currentTime, // Temps associé au sous-titre
  //   });
  // }

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
  // loadVideoDuration(): void {
  //   this.videoService
  //     .getVideoDuration(this.videoUrl)
  //     .then((duration) => {
  //       this.videoDuration = Math.floor(duration); // Durée en secondes
  //       console.log('Durée de la vidéo (en secondes) :', this.videoDuration);
  //     })
  //     .catch((error) => {
  //       console.error(
  //         'Erreur lors de la récupération de la durée de la vidéo :',
  //         error
  //       );
  //     });
  // }

  // Charger les segments associés à la session
  loadSegments(): void {
    this.sessionService.getSegmentsWithSubtitles(this.sessionId).subscribe({
      next: (response) => {
        this.segments = response.segments;
        console.log('Segments chargés:', this.segments);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des segments:', error);
        alert(
          'Impossible de charger les segments. Vérifiez votre connexion au backend.'
        );
      },
    });
  }

  // Connexion au socket pour recevoir les mises à jour
  connectToSocket(): void {
    this.socketService.joinVideoSession({
      userId: this.userId,
      userName: this.user?.username || 'Collaborateur',
      videoId: this.videoUrl,
    });

    // Recevoir les mises à jour des sous-titres
    this.socketService.onSubtitleUpdate().subscribe((subtitle) => {
      if (subtitle.videoId === this.videoUrl) {
        this.displayedSubtitle = subtitle.text;
      }
    });

    // Gestion des utilisateurs connectés
    this.socketService.onUserJoined().subscribe((user) => {
      this.collaborators += 1;
      console.log(`${user.userName} a rejoint la session.`);
    });

    this.socketService.onUserLeft().subscribe((user) => {
      this.collaborators -= 1;
      console.log(`${user.userName} a quitté la session.`);
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
      videoId: this.videoUrl,
    });
  }

  // updateSubtitleDisplay() {
  //   const videoElement = document.getElementById('liveVideo') as HTMLVideoElement;
  //   const currentTime = videoElement.currentTime;

  //   const currentSubtitle = this.subtitleList.find(
  //     subtitle => currentTime >= subtitle.startTime && currentTime <= subtitle.endTime
  //   );

  //   this.displayedSubtitle = currentSubtitle ? currentSubtitle.text : '';
  // }

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
