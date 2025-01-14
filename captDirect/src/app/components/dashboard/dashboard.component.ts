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
  userId: number = 0; // Identifiant utilisateur récupéré dynamiquement
  videoUrl = ''; // URL de la vidéo récupérée dynamiquement
  sessionId: number = 13; // ID de la session à afficher
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
    private videoService: VideoService
  ) {}

  ngOnInit() {
    this.loadUserSession();
    this.loadSessionDetails();
    this.connectToSocket();
    this.loadSessionInfo();
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
