import { AuthService } from './../../services/auth/auth.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SocketService } from '../../services/socket.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService } from '../../services/sessions/session.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatIconModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
// export class DashboardComponent implements OnInit, OnDestroy {
//   isAuthenticated: boolean = false;
//   isLoading = true;
//   subtitleText = '';
//   displayedSubtitle = '';
//   userId = ''; // Identifiant utilisateur récupéré dynamiquement
//   videoUrl = ''; // URL de la vidéo récupérée dynamiquement
//   sessionId: number = 1; // Session ID pour la session 1
//   segments: any[] = [];
//   collaborators: number = 1; // Nombre de collaborateurs en ligne
//   user: any;

//   constructor(
//     private socketService: SocketService,
//     private authService: AuthService,
//     private router: Router,
//     private sessionService: SessionService
//   ) {}

//   ngOnInit() {
//     console.log('Initialisation de ngOnInit dans DashboardComponent'); // Vérifiez que ngOnInit est appelé
//     this.loadUserSession();
//     this.loadSessionVideo();
//     const authToken = localStorage.getItem('authToken');
//     // Rejoindre une session vidéo
//     this.socketService.joinVideoSession({
//       userId: this.userId,
//       userName: 'John Doe',
//       videoId: this.videoUrl,
//     });

//     // Écoute des événements
//     this.socketService.onSubtitleUpdate().subscribe((subtitle) => {
//       if (subtitle.videoId === this.videoId) {
//         this.displayedSubtitle = subtitle.text;
//       }
//     });

//     this.socketService.onUserJoined().subscribe((user) => {
//       console.log(`${user.userName} a rejoint la session.`);
//     });

//     this.socketService.onUserLeft().subscribe((user) => {
//       console.log(`${user.userName} a quitté la session.`);
//     });
//   }

//   loadUserSession(): void {
//     this.authService.getUserSession().subscribe(
//       (response) => {
//         this.user = response;
//         this.isLoading = false;
//         console.log('Session utilisateur chargée:', this.user);
//       },
//       (error) => {
//         console.error(
//           'Erreur lors de la récupération de la session utilisateur:',
//           error
//         );
//         if (error.status === 401) {
//           this.router.navigate(['/login-page']);
//         }
//       }
//     );
//   }

//   onSubtitleChange() {
//     const timestamp = Date.now();
//     this.socketService.sendSubtitle({
//       text: this.subtitleText,
//       videoId: this.videoId,
//       timestamp,
//     });
//   }

//   ngOnDestroy() {
//     this.socketService.leaveVideoSession({
//       userId: this.userId,
//       videoId: this.videoId,
//     });
//   }
//   onLogout() {
//     this.authService.logout().subscribe({
//       next: () => {
//         this.router.navigate(['/login-page']); // Redirige vers la page de connexion après la déconnexion
//       },
//       error: (error) => {
//         console.error('Error during logout:', error);
//         // Afficher un message d'erreur ou gérer l'erreur ici si nécessaire
//       },
//     });
//   }
// }
export class DashboardComponent implements OnInit, OnDestroy {
  isAuthenticated: boolean = false;
  isLoading = true;
  subtitleText = '';
  displayedSubtitle = '';
  userId = ''; // Identifiant utilisateur récupéré dynamiquement
  videoUrl = ''; // URL de la vidéo récupérée dynamiquement
  sessionId: number = 1; // Session ID pour la session 1
  segments: any[] = [];
  collaborators: number = 1; // Nombre de collaborateurs en ligne
  user: any;

  constructor(
    private socketService: SocketService,
    private authService: AuthService,
    private router: Router,
    private sessionService: SessionService
  ) {}

  ngOnInit() {
    this.loadUserSession();
    this.loadSessionVideo();
    this.connectToSocket();
  }

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

  loadSessionVideo(): void {
    // Appeler le backend pour récupérer les informations de la session 1
    this.sessionService.getSessionById(this.sessionId).subscribe({
      next: (response: { video_url: string }) => {
        this.videoUrl = response.video_url;
        console.log('Vidéo URL récupérée:', this.videoUrl);
        this.loadSegments();
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement de la vidéo:', error);
      },
    });
  }

  loadSegments(): void {
    // Charger les segments associés à la session
    this.sessionService.getSegmentsWithSubtitles(this.sessionId).subscribe({
      next: (response) => {
        this.segments = response.segments;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des segments:', error);
        alert(
          'Impossible de charger les segments. Veuillez vérifier votre connexion au backend.'
        );
      },
    });
  }

  connectToSocket(): void {
    // Connexion à la session via Socket
    this.socketService.joinVideoSession({
      userId: this.userId,
      userName: this.user?.username || 'Collaborateur',
      videoId: this.videoUrl,
    });

    // Écouter les mises à jour des sous-titres
    this.socketService.onSubtitleUpdate().subscribe((subtitle) => {
      if (subtitle.videoId === this.videoUrl) {
        this.displayedSubtitle = subtitle.text;
      }
    });

    // Gestion des collaborateurs connectés
    this.socketService.onUserJoined().subscribe((user) => {
      this.collaborators += 1;
      console.log(`${user.userName} a rejoint la session.`);
    });

    this.socketService.onUserLeft().subscribe((user) => {
      this.collaborators -= 1;
      console.log(`${user.userName} a quitté la session.`);
    });
  }

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

  onLogout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login-page']); // Redirige vers la page de connexion après la déconnexion
      },
      error: (error) => {
        console.error('Error during logout:', error);
      },
    });
  }
}
