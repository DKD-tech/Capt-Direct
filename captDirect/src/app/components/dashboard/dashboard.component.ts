import { SubtitleService } from './../../services/sessions/subtitle.service';
import { VideoService } from './../../services/sessions/video.service';
import { AuthService } from './../../services/auth/auth.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SocketService } from '../../services/socket.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService } from '../../services/sessions/session.service';
import { CommonModule } from '@angular/common';
import { trigger, style, animate, transition } from '@angular/animations';
import { ChangeDetectorRef } from '@angular/core';

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
  userId: number = 0;
  videoUrl = '';
  sessionId: number = 30;
  segments: any[] = [];
  username: string = '';
  collaborators: number = 1;
  user: any;
  users: string[] = [];
  sessionName: string = '';
  sessionDescription: string = '';
  sessionStatus: string = '';
  duration: number | null = null;

  liveSubtitles: any[] = []; // Stocke les sous-titres en direct
  finalizedSubtitles: any[] = [];   // Stocke les sous-titres finalisés
  maxVisibleSubtitles = 3; 

  constructor(
    private socketService: SocketService,
    private authService: AuthService,
    private router: Router,
    private sessionService: SessionService,
    private videoService: VideoService,
    private subtitleService: SubtitleService,
    private cdRef: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadUserSession();
    this.loadSessionDetails();
    this.connectToSocket();
    this.loadSessionInfo();
    this.loadLiveSubtitles();
    this.loadSegments();
    this.loadFinalizedSubtitles();
    this.listenForSubtitleUpdates();

    this.socketService.onSocketConnect().subscribe(() => {
      console.log("🚀 Connexion établie avec succès !");
    });
    this.socketService.listen("word_added").subscribe((data: any) => {
      console.log("🔥 DEBUG DIRECT : `word_added` reçu :", data);
    });
    
    
    this.authService.getUserSession().subscribe((user) => {
      this.username = user.username.trim();
      this.userId = Number(user.user_id);

      
      this.socketService.joinSession(
        this.sessionId,
        this.username,
        this.userId
      );
      

      this.socketService.getUsers().subscribe((users) => {
        this.users = users;
        console.log('Utilisateurs connectés à la session :', this.users);
      });
    });

    this.socketService.onWordAdded().subscribe((data) => {
      if (!data?.word) {
        console.warn("⚠️ Mot reçu invalide :", data);
        return;
      }
    
      // 🔹 Ajout ou concaténation du mot dans liveSubtitles
      if (this.liveSubtitles.length > 0) {
        this.liveSubtitles[this.liveSubtitles.length - 1].text += " " + data.word;
      } else {
        this.liveSubtitles.push({ text: data.word });
      }
    
// Ajouter le mot au dernier sous-titre ou créer une nouvelle ligne
if (this.liveSubtitles.length > 0) {
  this.liveSubtitles[this.liveSubtitles.length - 1].text += " " + data.word;
} else {
  this.liveSubtitles.push({ text: data.word });
}

// Si trop de sous-titres visibles, supprimer les anciens
if (this.liveSubtitles.length > this.maxVisibleSubtitles) {
  setTimeout(() => {
    this.liveSubtitles.shift();
    this.cdRef.detectChanges();
  }, 1500); // Délai avant suppression
}

      this.cdRef.detectChanges(); // 🔄 Mise à jour de l'affichage
    });
    
    this.socketService.onWordReceived().subscribe((data: any) => {
      if (!data?.word) {
        console.warn("⚠️ Mot reçu invalide :", data);
        return;
      }
    
      // 🔹 Ajout ou concaténation du mot dans liveSubtitles
      if (this.liveSubtitles.length > 0) {
        this.liveSubtitles[this.liveSubtitles.length - 1].text += " " + data.word;
      } else {
        this.liveSubtitles.push({ text: data.word });
      }
    
      this.cdRef.detectChanges(); // 🔄 Mise à jour de l'affichage
    });
    
    // Écoute de la finalisation des sous-titres
this.socketService.onSubtitleFinalized().subscribe(({ segment_id, finalText }) => {
  console.log("🔴 [SOCKET] `subtitle_finalized` reçu :", { segment_id, finalText });
  const segment = this.segments.find((s) => s.segment_id === segment_id);
  if (segment) {
    segment.subtitleText = finalText;

    // ✅ Mettre à jour l'état du segment pour désactiver la saisie
    segment.isFinalized = true;
    segment.isDisabled = true;

    // 🔄 Mise à jour du DOM pour refléter le changement
    this.cdRef.detectChanges();
    console.log(`✅ Sous-titre finalisé pour segment ${segment_id}, la saisie est désormais bloquée.`);
  }
});

    
  }

  loadUserSession(): void {
    this.authService.getUserSession().subscribe(
      (response) => {
        this.user = response;
        this.userId = response.user_id;
        this.isLoading = false;
      },
      (error) => {
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
          try {
            this.duration = await this.videoService.getVideoDuration(
              this.videoUrl
            );
            this.sessionService.storeVideoDuration(this.sessionId, this.duration).subscribe();
          } catch (error) {
            console.error('Erreur lors de la récupération de la durée :', error);
          }
        }
      },
    });
  }

  onSubtitleInput(event: KeyboardEvent, segment: any) {
    if (segment.isFinalized) {
      console.warn(`⚠️ Impossible d'envoyer : le segment ${segment.segment_id} est déjà finalisé.`);
      return; // 🔹 Empêcher tout envoi
    }
    
    if (event.key === ' ') {  
      event.preventDefault(); // Empêche l'ajout automatique de l'espace
  
      const words = segment.subtitleText.trim().split(' ');
      const lastWord = words.pop(); // 🔹 Supprime le dernier mot de la phrase
  
      if (lastWord) {
        console.log("📤 [DEBUG] Envoi du mot :", lastWord, "pour segment :", segment);
  
        // ✅ Vérifier si le segment n'est pas finalisé avant envoi
        if (!segment.isFinalized) {
          this.sendWordToBackend(lastWord, segment);
        } else {
          console.warn(`🚫 Le segment ${segment.segment_id} est finalisé. Aucun mot ne sera envoyé.`);
        }
  
        // ✅ Mise à jour immédiate de l'affichage des sous-titres
        if (this.liveSubtitles.length > 0) {
          this.liveSubtitles[this.liveSubtitles.length - 1].text += " " + lastWord;
        } else {
          this.liveSubtitles.push({ text: lastWord });
        }
        
        this.cdRef.detectChanges();
      }
  
      // ✅ Met à jour l'input texte sans le dernier mot
      segment.subtitleText = words.join(' ');
    }
  }
  
  sendWordToBackend(word: string, segment: any): void { 
    if (!word.trim()) return; // Ne rien envoyer si le mot est vide
  
    if (!segment || !segment.segment_id) {
      console.error("❌ ERREUR : segment_id est manquant !", segment);
      return;
    }
  
    // ✅ Bloquer l'envoi du mot si le segment est finalisé
    if (segment.isFinalized) {
      console.warn(`⚠️ Impossible d'envoyer : le segment ${segment.segment_id} est déjà finalisé.`);
      return;
    }
  
    const payload = {
      segment_id: segment.segment_id,
      word: word.trim(),
      created_by: this.userId
    };
  
    console.log("📡 [DEBUG] Données envoyées à l'API :", payload);
  
    this.sessionService.addWord(segment.segment_id, word.trim(), this.userId).subscribe({
      next: (response) => {
        console.log("✅ [API] Mot ajouté en base :", response);
        
        segment.subtitleText = '';
  
        setTimeout(() => {
          this.cdRef.detectChanges();
          console.log("🔄 Affichage mis à jour après suppression du mot !");
        }, 50);
      },
      error: (error) => {
        console.error("❌ [API] Erreur lors de l'envoi du mot :", error);
      }
    });
  }
  

  loadSegments(): void {
    this.sessionService.getSegmentsWithSession(this.sessionId).subscribe({
      next: (response) => {
        console.log("Segments récupérés :", response.segments); // 📌 Log avant traitement
      
        this.segments = response.segments.map((segment: any) => ({
          ...segment,
          subtitleText: '',
          timeRemaining: this.calculateDurationInSeconds(segment.start_time, segment.end_time),
          isDisabled: segment.is_finalized || false,  // 🔹 Désactiver la saisie si le segment est finalisé
          isFinalized: segment.is_finalized || false, // 🔹 Stocker l'état de finalisation
          isBlinking: false,
          isActive: false,
          assigned_to: segment.assigned_to || 'Utilisateur inconnu',
          subtitles: segment.subtitles || [],
        }));
  
        console.log("🚀 [DEBUG] Après chargement, segments:", this.segments); // 📌 Log après traitement
      
      },
      error: (error) => {
        console.error("Erreur lors du chargement des segments :", error);
      },
    });
  }
  
finalizeSubtitle(segment: any): void {
  if (!segment.segment_id || !this.userId) {
    console.error("❌ Erreur : segment_id ou userId manquant !", { segment_id: segment.segment_id, userId: this.userId });
    return;
  }

  // 🔹 Désactiver la zone de texte pour ce segment AVANT l'envoi au serveur
  segment.isDisabled = true;
  segment.isFinalized = true;

  this.sessionService.finalizeSubtitle(segment.segment_id, this.userId).subscribe({
    next: (response) => {
      console.log(`✅ Sous-titre finalisé pour le segment ${segment.segment_id} :`, response);

      // 🔹 Mettre à jour `isFinalized` pour éviter que l'utilisateur écrive encore
      segment.isFinalized = true;
      segment.isDisabled = true; 

      // 🔄 Mettre à jour l'affichage
      this.cdRef.detectChanges();
    },
    error: (error) => {
      console.error(`❌ Erreur lors de la finalisation du segment ${segment.segment_id} :`, error);
      segment.isDisabled = false; // 🔄 Réactiver en cas d'échec
    }
  });
}



  connectToSocket(): void {
    this.socketService.onWordReceived().subscribe((data) => {
      const segment = this.segments.find((seg) => seg.segment_id === data.segment_id);
      if (segment) {
        segment.subtitleText += ` ${data.word}`;
      }
    });

    this.socketService.onSubtitleFinalized().subscribe((data) => {
      const segment = this.segments.find((seg) => seg.segment_id === data.segment_id);
      if (segment) {
        segment.subtitleText = data.finalText;
        segment.isDisabled = true;
      }
    });
  }

  compileFinalSubtitles(): string {
    return this.segments
      .filter((segment) => segment.subtitles.length > 0)
      .map((segment) => {
        const combinedText = segment.subtitles.map((s: { text: any }) => s.text).join(' ');
        return `${segment.start_time} --> ${segment.end_time}\n${combinedText}`;
      })
      .join('\n\n');
  }

  exportToSRT(): string {
    let subtitleIndex = 1;
    return this.segments
      .filter((segment) => segment.subtitles.length > 0)
      .map((segment) => {
        const fullText = segment.subtitles.map((s: { text: string }) => s.text).join(' ');
        const sanitizedText = fullText.replace(/[\r\n]+/g, ' ').trim();
        return `${subtitleIndex++}\n${segment.start_time} --> ${segment.end_time}\n${sanitizedText}`;
      })
      .join('\n\n');
  }

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

  ngOnDestroy() {
    this.socketService.leaveVideoSession({
      userId: this.userId,
      sessionId: this.sessionId,
    });
  }

  onLogout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login-page']);
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
  autoSaveSubtitle(segment: any): void {
    console.log(`⌛ Temps écoulé, finalisation du segment ${segment.segment_id}`);
  
    this.sessionService
      .finalizeSubtitle(segment.segment_id, this.userId)  // ✅ On enregistre le texte complet du segment
      .subscribe({
        next: (response) => {
          console.log(`✅ Sous-titre finalisé et enregistré en base pour le segment ${segment.segment_id} :`, response);
          segment.subtitleText = ''; // Nettoyage de l'input après enregistrement
        },
        error: (error) => {
          console.error(`❌ Erreur lors de la finalisation du sous-titre pour le segment ${segment.segment_id} :`, error);
        },
      });
  
    segment.isDisabled = true; // Désactiver l’édition du segment après la fin du timer
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

  startTimerForSegment(segment: any): void {
    if (segment.isFinalized) {
      console.warn(`⏳ Le segment ${segment.segment_id} est déjà finalisé, pas de timer.`);
      return; // ❌ Empêche le timer de démarrer
    }
  
    if (segment.timer) return; // ⏳ Ne démarre pas un timer déjà actif
  
    console.log(`🚀 Démarrage du timer pour le segment ${segment.segment_id}`);
    segment.timeRemaining += 10;
  
    segment.timer = setInterval(() => {
      if (segment.timeRemaining > 0) {
        segment.timeRemaining--;
        if (segment.timeRemaining === 5) {
          segment.isBlinking = true;
        }
      } else {
        clearInterval(segment.timer);
        segment.timer = null;
        segment.isBlinking = false;
        console.log(`⏳ Timer terminé pour le segment ${segment.segment_id}`);
  
        // ✅ Finalisation automatique du segment
        this.finalizeSegmentSubtitle(segment);
      }
    }, 1000);
  }
  
  /**
   * Active le prochain segment basé sur `start_time`.
   */
  activateNextSegment(currentSegment: any): void {
    // Trouver l'index du segment actuel
    const currentIndex = this.segments.findIndex(seg => seg.segment_id === currentSegment.segment_id);
  
    if (currentIndex !== -1 && currentIndex < this.segments.length - 1) {
      const nextSegment = this.segments[currentIndex + 1];
      console.log(`Segment suivant activé : Segment ID ${nextSegment.segment_id}`);
  
      // Activer le segment avec une transition de 5 secondes
      nextSegment.isBlinking = true;
      setTimeout(() => {
        nextSegment.isBlinking = false;
        nextSegment.isActive = true;
      }, 5000);
    } else {
      console.log("Aucun segment suivant trouvé localement.");
    }
  }
  
  
  calculateDurationInSeconds(startTime: string, endTime: string): number {
    const [startHours, startMinutes, startSeconds] = startTime.split(':').map(Number);
    const [endHours, endMinutes, endSeconds] = endTime.split(':').map(Number);
    const startTotalSeconds = startHours * 3600 + startMinutes * 60 + startSeconds;
    const endTotalSeconds = endHours * 3600 + endMinutes * 60 + endSeconds;
    return endTotalSeconds - startTotalSeconds;
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

  handleWordInput(event: KeyboardEvent, segment: any): void {
    if (event.key === ' ') { // Détection de l'espace
      const words = segment.subtitleText.trim().split(' ');
      const lastWord = words[words.length - 1];
  
      if (lastWord) {
        this.socketService.sendWord(segment.segment_id, lastWord, this.userId);
        console.log(`Mot envoyé : "${lastWord}" pour le segment ${segment.segment_id}`);
      }
    }
  }
  
  finalizeSegmentSubtitle(segment: any): void {
    if (!segment.segment_id || !this.userId) {
      console.error("❌ Erreur : segment_id ou userId manquant !", { segment_id: segment.segment_id, userId: this.userId });
      return;
    }
  
    // 🔹 Désactiver la zone de texte pour ce segment
    segment.isDisabled = true;
  
    // ✅ Envoyer la finalisation au serveur
    this.sessionService.finalizeSubtitle(segment.segment_id, this.userId).subscribe({
      next: (response) => {
        console.log(`✅ Sous-titre finalisé pour le segment ${segment.segment_id} :`, response);
        
        // 🔹 Marquer le segment comme finalisé
        segment.isFinalized = true; 
  
        // 🧹 Nettoyer la zone de texte
        segment.subtitleText = ""; 
      },
      error: (error) => {
        console.error(`❌ Erreur lors de la finalisation du segment ${segment.segment_id} :`, error);
        segment.isDisabled = false; // 🔄 Réactiver en cas d'échec
      }
    });
  }
  
  loadLiveSubtitles(): void {
    this.socketService.onSubtitleUpdate().subscribe((data: any) => {
      console.log("📌 Sous-titre reçu en temps réel :", data);
      
      if (data && data.text) {
        this.liveSubtitles.push({
          text: data.text,
          created_by: data.user_id,
        });
  
        // Garde uniquement les derniers sous-titres affichés (optionnel)
        if (this.liveSubtitles.length > 10) {
          this.liveSubtitles.shift();
        }
      }
    });
  }
  
  listenForSubtitleUpdates(): void {
    this.socketService.onSubtitleUpdate().subscribe((data: any) => {
      console.log("📝 Nouveau mot reçu :", data);
  
      // 🔹 Trouver le segment correspondant
      const segment = this.segments.find(s => s.segment_id === data.segment_id);
      if (segment) {
        segment.subtitleText += ' ' + data.text; // Ajoute le mot au texte en cours
      }
    });
  }
  

  loadFinalizedSubtitles(): void {
    this.socketService.onSubtitleFinalized().subscribe((data: any) => {
      console.log("✅ Sous-titre finalisé reçu :", data);
  
      if (data && data.text) {
        this.finalizedSubtitles.push({
          text: data.text,
          created_by: data.user_id,
        });
  
        // Optionnel : garde uniquement les 10 derniers sous-titres affichés
        if (this.finalizedSubtitles.length > 10) {
          this.finalizedSubtitles.shift();
        }
      }
    });
  }
  testLiveSubtitles() {
    console.log("🔍 TEST : Contenu actuel de liveSubtitles :", this.liveSubtitles);
  }
  
}
