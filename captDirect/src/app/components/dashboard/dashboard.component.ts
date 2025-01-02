import { VideoService } from './../../services/sessions/video.service';
import { AuthService } from './../../services/auth/auth.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SocketService } from '../../services/socket.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService } from '../../services/sessions/session.service';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user/user.service';
import {jwtDecode} from 'jwt-decode';



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
  userId = '';
  videoUrl = '';
  sessionId: number = 4;
  segments: any[] = [];
  collaborators: number = 1;
  user: any;
  sessionName: string = '';
  sessionDescription: string = '';
  sessionStatus: string = '';
  duration: number | null = null;

  // Synchronisation des sous-titres
  private startTime: number | null = null;
  private typingTimeout: any = null;

  // Liste des sous-titres capturés
  subtitles: { startTime: number; endTime: number; text: string }[] = [];

  constructor(
    private socketService: SocketService,
    private authService: AuthService,
    private router: Router,
    private sessionService: SessionService,
    private videoService: VideoService,
    
  ) {}

  ngOnInit() {
    this.loadUserSession();
    this.loadSessionDetails();
    this.connectToSocket();
    this.loadSessionInfo();
  }

  // Gestion des sous-titres en direct
  onSubtitleChange(): void {
    if (!this.userId) {
      console.error('userId non chargé, impossible de sous-titrer.');
      return;
    }
    
    const videoElement = document.getElementById('liveVideo') as HTMLVideoElement;

    if (!videoElement) {
      console.error('Élément vidéo introuvable.');
      return;
    }

    const currentTime = videoElement.currentTime;

    // Capturer le temps de début lors de la première frappe
    if (!this.startTime) {
      this.startTime = currentTime;
      console.log('Start time capturé :', this.startTime);
    }

    // Mettre à jour le sous-titre en direct
    this.displayedSubtitle = this.subtitleText;

    // Réinitialiser le timeout pour détecter l'inactivité
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Lancer un timeout pour détecter la fin de la saisie
    this.typingTimeout = setTimeout(() => {
      this.endSubtitle(currentTime);
    }, 2000); // Délai réduit pour une meilleure réactivité
  }

  private endSubtitle(endTime: number): void {
    console.log('End time capturé :', endTime);
    console.log('Contenu de subtitleText :', this.subtitleText);
    console.log('userId au moment de l\'envoi :', this.userId);


    // Ajouter le sous-titre terminé à la liste si le texte est valide
    if (this.startTime !== null && this.subtitleText.trim() !== '') {
      const newSubtitle = {
        startTime: this.startTime,
        endTime: endTime,
        text: this.subtitleText.trim(),
        videoId: this.videoUrl,
        userId: this.userId,
      };

      // Envoyer au serveur via Socket.IO avant affichage
      this.socketService.sendSubtitle({
  text: this.subtitleText.trim(),
  videoId: this.videoUrl,
  startTime: this.startTime,
  endTime,
  userId: this.userId, // Vérifiez si ceci est défini
});


      // Ajouter à la liste locale pour export ou suivi
      this.subtitles.push(newSubtitle);

      console.log('Sous-titre envoyé au serveur et ajouté à la liste :', newSubtitle);
    }

    // Réinitialiser les champs pour la prochaine saisie
    this.displayedSubtitle = '';
    this.startTime = null;
    this.subtitleText = '';
  }

  connectToSocket(): void {
    this.socketService.joinVideoSession({
      userId: this.userId,
      userName: this.user?.username || 'Collaborateur',
      videoId: this.videoUrl,
    });

    // Écouter les sous-titres confirmés par le serveur
    this.socketService.onSubtitleConfirmed().subscribe((subtitle) => {
      console.log('Sous-titre confirmé par le serveur :', subtitle);
      this.displayedSubtitle = subtitle.text; // Mettre à jour l'affichage
    });

    // Gérer les sous-titres d'autres utilisateurs
    this.socketService.onSubtitleUpdate().subscribe((subtitle) => {
      if (subtitle.videoId === this.videoUrl) {
        console.log('Sous-titre reçu d\'un collaborateur :', subtitle);
        this.displayedSubtitle = subtitle.text;
      }
    });

    // Gestion des utilisateurs qui rejoignent ou quittent
    this.socketService.onUserJoined().subscribe((user) => {
      this.collaborators += 1;
      console.log(`${user.userName} a rejoint la session.`);
    });

    this.socketService.onUserLeft().subscribe((user) => {
      this.collaborators -= 1;
      console.log(`${user.userName} a quitté la session.`);
    });
  }

  // Générer le contenu SRT
  generateSRT(): string {
    let srtContent = '';
    this.subtitles.forEach((subtitle, index) => {
      const sequenceNumber = index + 1;
      const startTime = this.formatTime(subtitle.startTime);
      const endTime = this.formatTime(subtitle.endTime);
      const text = subtitle.text;

      srtContent += `${sequenceNumber}\n${startTime} --> ${endTime}\n${text}\n\n`;
    });

    return srtContent;
  }

  private formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.round((seconds - Math.floor(seconds)) * 1000);

    return `${this.pad(hrs, 2)}:${this.pad(mins, 2)}:${this.pad(secs, 2)},${this.pad(ms, 3)}`;
  }

  private pad(num: number, size: number): string {
    let s = num.toString();
    while (s.length < size) s = '0' + s;
    return s;
  }

  exportSubtitles(): void {
    const srtContent = this.generateSRT();
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtitles.srt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    console.log('Fichier SRT exporté avec succès.');
  }

// Charger les informations utilisateur
loadUserSession(): void {
  // Étape 1 : Charger l'userId depuis le token JWT stocké dans localStorage
  const token = localStorage.getItem('authToken'); // Assurez-vous que 'authToken' est bien la clé utilisée
  if (token) {
    try {
      const decodedToken: any = jwtDecode(token); // Décodez le token
      this.userId = decodedToken.id; // Assurez-vous que 'id' est bien présent dans le token
      console.log('userId chargé depuis le token :', this.userId);
    } catch (error) {
      console.error('Erreur lors du décodage du token :', error);
    }
  } else {
    console.error('Aucun token trouvé dans localStorage.');
  }

  // Étape 2 : Appeler l'API pour récupérer la session utilisateur si nécessaire
  this.authService.getUserSession().subscribe({
    next: (response) => {
      console.log('Réponse API utilisateur :', response);

      // Valider la structure de la réponse
      if (response && response.user) {
        this.user = response.user;

        // Mettre à jour l'userId si le token n'a pas fourni d'id valide
        if (!this.userId && response.user.id) {
          this.userId = response.user.id;
          console.log('userId mis à jour depuis l’API :', this.userId);
        }
        console.log('Utilisateur chargé avec succès :', this.user); // Log de contrôle
      } else {
        console.error('Réponse API invalide, objet utilisateur manquant.');
      }

      console.log('Identifiant utilisateur (userId) :', this.userId); // Vérifiez ici
      this.isLoading = false;
    },
    error: (error) => {
      console.error('Erreur lors de la récupération de la session utilisateur :', error);
      if (error.status === 401) {
        this.router.navigate(['/login-page']);
      }
    },
  });
}

  loadSessionDetails(): void {
    this.sessionService.getSessionById(this.sessionId).subscribe({
      next: async (response: any) => {
        if (response && response.video_url) {
          this.videoUrl = `/videos/${response.video_url}`;
          console.log('Vidéo URL récupérée :', this.videoUrl);
          try {
            this.duration = await this.videoService.getVideoDuration(this.videoUrl);
            console.log('Durée de la vidéo récupérée :', this.duration);
            this.sessionService.storeVideoDuration(this.sessionId, this.duration).subscribe();
          } catch (error) {
            console.error('Erreur lors de la récupération de la durée de la vidéo :', error);
          }
        }
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement de la session :', error);
      },
    });
  }

  loadSessionInfo(): void {
    this.sessionService.getSessionById(this.sessionId).subscribe({
      next: (response) => {
        this.videoUrl = `/videos/${response.video_url}`;
        this.sessionName = response.session_name;
        this.sessionDescription = response.description;
        this.sessionStatus = response.status;
      },
      error: (error) => console.error('Erreur lors du chargement des détails de la session :', error),
    });
  }

  onVideoError(): void {
    console.error('La vidéo ne peut pas être chargée :', this.videoUrl);
    alert('Impossible de charger la vidéo.');
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login-page']),
      error: (error) => console.error('Erreur lors de la déconnexion :', error),
    });
  }

  ngOnDestroy(): void {
    this.socketService.leaveVideoSession({
      userId: this.userId,
      videoId: this.videoUrl,
    });
  }
}
