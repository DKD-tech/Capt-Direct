import { AuthService } from './../../services/auth/auth.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SocketService } from '../../services/socket.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatIconModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  isAuthenticated: boolean = false;
  isLoading = true;
  subtitleText = '';
  displayedSubtitle = '';
  userId = 'user1'; // Identifiant utilisateur fictif
  videoId = 'video1'; // Identifiant vidéo fictif
  user: any;

  constructor(
    private socketService: SocketService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('Initialisation de ngOnInit dans DashboardComponent'); // Vérifiez que ngOnInit est appelé
    this.loadUserSession();
    const authToken = localStorage.getItem('authToken');
    // Rejoindre une session vidéo
    this.socketService.joinVideoSession({
      userId: this.userId,
      userName: 'John Doe',
      videoId: this.videoId,
    });

    // Écoute des événements
    this.socketService.onSubtitleUpdate().subscribe((subtitle) => {
      if (subtitle.videoId === this.videoId) {
        this.displayedSubtitle = subtitle.text;
      }
    });

    this.socketService.onUserJoined().subscribe((user) => {
      console.log(`${user.userName} a rejoint la session.`);
    });

    this.socketService.onUserLeft().subscribe((user) => {
      console.log(`${user.userName} a quitté la session.`);
    });
  }

  loadUserSession(): void {
    this.authService.getUserSession().subscribe(
      (response) => {
        this.user = response;
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
  onSubtitleChange() {
    const timestamp = Date.now();
    this.socketService.sendSubtitle({
      text: this.subtitleText,
      videoId: this.videoId,
      timestamp,
    });
  }

  ngOnDestroy() {
    this.socketService.leaveVideoSession({
      userId: this.userId,
      videoId: this.videoId,
    });
  }
  onLogout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login-page']); // Redirige vers la page de connexion après la déconnexion
      },
      error: (error) => {
        console.error('Error during logout:', error);
        // Afficher un message d'erreur ou gérer l'erreur ici si nécessaire
      },
    });
  }
}
