import { interval, Subscription } from 'rxjs';
import { SubtitleService } from './../../services/sessions/subtitle.service';
import { VideoService } from './../../services/sessions/video.service';
import { AuthService } from './../../services/auth/auth.service';
import {
  Component,
  OnDestroy,
  OnInit,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { SocketService } from '../../services/socket.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService } from '../../services/sessions/session.service';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    MatIconModule,
    FormsModule,
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  // --- Propriétés principales ---
  isAuthenticated: boolean = false;
  isLoading = true;
  subtitleText = '';
  displayedSubtitle = '';
  userId: number = 0; // Identifiant utilisateur récupéré dynamiquement
  videoUrl = ''; // URL de la vidéo récupérée dynamiquement
  sessionId: number = 128; // ID de la session à afficher
  segments: any[] = []; // Array de segments (avec warningFlag, isVisible, timer, etc.)
  username: string = '';
  collaborators: number = 1; // Nombre de collaborateurs en ligne
  user: any;
  users: string[] = [];
  sessionName: string = '';
  sessionDescription: string = '';
  sessionStatus: string = '';
  duration: number | null = null; // Durée de la vidéo (secondes)
  hasStartedTyping = false; // SI l’utilisateur a déjà cliqué dans la zone de saisie
  videoLoaded = false; // SI la vidéo est chargée
  activeSegment: any = null; // Premier segment actuellement en cours pour cet utilisateur
  activeSegments: any[] = []; // Tous les segments chevauchants actuellement en cours pour cet utilisateur
  nextSegment: any = null; // Premier segment à venir (warning/orange)
  officialStartTime = 0; // Timestamp (ms) du début de session (fourni par le back ou by default Date.now())
  elapsedTime = 0; // Temps écoulé (secondes) depuis officialStartTime
  streamStarted = false; // SI le flux a été démarré (countdown passé)
  countdown = 5; // Compte à rebours avant démarrage
  countdownMessage = '';
  signalUpdateInterval: any = null;
  now: number = Date.now();
  nowSub!: Subscription;
  warningThresholdSec: number = 5;

  // ID du setInterval pour la boucle globale

  constructor(
    private socketService: SocketService,
    private authService: AuthService,
    private router: Router,
    private sessionService: SessionService,
    private videoService: VideoService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private SubtitleService: SubtitleService
  ) {}

  ngOnInit() {
    // 1) Charger l’utilisateur puis joindre la session WebSocket
    this.loadUserSession();
    // 2) Charger détails de session (pour récupérer videoUrl et durée)
    this.loadSessionDetails();
    // 3) Refaire aussi un chargement simplifié pour afficher infos (nom, desc, status)
    this.loadSessionInfo();

    // 4) Une fois que l’utilisateur est authentifié, on rejoint le canal Socket et on branche les events
    this.authService.getUserSession().subscribe({
      next: async (user) => {
        this.username = (user.username || '').toLowerCase().trim();
        this.userId = Number(user.user_id);

        localStorage.setItem('userId', this.userId.toString());
        localStorage.setItem('username', this.username);
        localStorage.setItem('sessionId', this.sessionId.toString());

        await this.socketService.waitForConnection();
        this.socketService.joinSession(
          this.sessionId,
          this.username,
          this.userId
        );

        this.connectToSocket();
      },
      error: (err) => {
        console.error('Erreur dans getUserSession:', err);
      },
    });
    this.nowSub = interval(1000).subscribe(() => {
      this.now = Date.now();
    });
  }

  // ------------------------------------------------------------
  // 1) Chargement de la session utilisateur
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // 2) Chargement des détails de session (pour videoUrl et durée)
  // ------------------------------------------------------------
  loadSessionDetails(): void {
    this.sessionService.getSessionById(this.sessionId).subscribe({
      next: async (response: any) => {
        if (response && response.video_url) {
          this.videoUrl = `/videos/${response.video_url}`;
          console.log('Vidéo URL récupérée:', this.videoUrl);

          try {
            this.duration = await this.videoService.getVideoDuration(
              this.videoUrl
            );
            console.log('Durée de la vidéo récupérée :', this.duration);

            this.sessionService
              .storeVideoDuration(this.sessionId, this.duration!)
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

  // ------------------------------------------------------------
  // 3) Chargement simplifié des infos de session (nom, desc, status)
  // ------------------------------------------------------------
  loadSessionInfo(): void {
    this.sessionService.getSessionById(this.sessionId).subscribe({
      next: (response) => {
        console.log('Détails de la session récupérés :', response);
        this.videoUrl = `/videos/${response.video_url}`;
        this.sessionName = response.session_name;
        this.sessionDescription = response.description;
        this.sessionStatus = response.status;
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

  // ------------------------------------------------------------
  // 4) Chargement initial des segments depuis le service REST
  //    → Ajoute warningFlag, isVisible, timer à chaque segment
  // ------------------------------------------------------------
  loadSegments(callback?: () => void): void {
    this.sessionService.getSegmentsWithSession(this.sessionId).subscribe({
      next: (response) => {
        if (!response.segments || response.segments.length === 0) {
          console.warn('⚠️ Aucun segment assigné à cet utilisateur.');
          this.segments = [];
          if (callback) callback();
          return;
        }

        // 1) Tri par start_time
        const sorted = this.mergeSort(response.segments);

        // 2) Normalisation : assigned_to = lowercase & trim, calcul timeRemaining,
        //    initialisation warningFlag = false, isVisible = false, timer = null
        this.segments = sorted.map((segment: any) => {
          const duration = this.calculateDurationInSeconds(
            segment.start_time,
            segment.end_time
          );
          const parsedStart = this.timeStringToSeconds(segment.start_time);
          const parsedEnd = this.timeStringToSeconds(segment.end_time);
          console.log(
            `[loadSegments] segment_id=${segment.segment_id}, start_time="${segment.start_time}" → ${parsedStart}s, end_time="${segment.end_time}" → ${parsedEnd}s`
          );
          return {
            ...segment,
            subtitleText: '',
            timeRemaining: duration,
            timer: null,
            isVisible: false,
            warningFlag: false,
            assigned_to: (segment.assigned_to || 'Utilisateur inconnu')
              .toLowerCase()
              .trim(),
            subtitles: segment.subtitles || [],
            // NB: À ce stade, pas de start_unix car on recevra le segment en WebSocket
          };
        });

        console.log('✔ Segments chargés avec timers :', this.segments);
        if (callback) callback();
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des segments :', error);
        alert('Erreur lors du chargement des segments. Veuillez réessayer.');
        if (callback) callback();
      },
    });
  }

  // ------------------------------------------------------------
  // 5) Démarrage du flux (startStream appelle startSegmentation après countdown)
  // ------------------------------------------------------------
  startStream() {
    console.log('[DEBUG] startStream() déclenché'); // 1 : on voit le clic
    this.sessionService.startStream(this.sessionId).subscribe({
      next: () => {
        console.log(
          '[DEBUG] réponse du back pour startStream(), on entre dans le subscribe'
        );

        // On initialise le décompte à 5 secondes
        this.countdown = 5;
        this.streamStarted = true;

        // Affiche dès maintenant « Démarrage dans 5 seconde(s)… »
        this.countdownMessage = `Démarrage dans ${this.countdown} seconde(s)…`;
        console.log(
          '[DEBUG] countdownMessage initial =',
          this.countdownMessage
        );

        // Rappel de startSegmentation en calculant officialStartTime
        const officialStartTime = Date.now() + this.countdown * 1000;

        // Lancement d’un setInterval chacune des 1000 ms
        const interval = setInterval(() => {
          if (this.countdown > 0) {
            this.countdown--;
            this.countdownMessage = `Démarrage dans ${this.countdown} seconde(s)…`;
            console.log(
              '[DEBUG] countdownMessage mise à jour =',
              this.countdownMessage
            );

            // (si nécessaire, forcer la détection de changement)
            this.cdr.markForCheck();
          } else {
            clearInterval(interval);
            this.countdownMessage = '';
            console.log(
              '[DEBUG] countdown terminé, on efface countdownMessage'
            );
            this.cdr.markForCheck();

            // Maintenant que le compte à rebours est fini, on lance la segmentation
            this.startSegmentation(officialStartTime);
          }
        }, 1000);
      },
      error: (err) => {
        console.error('[DEBUG] Erreur dans startStream() :', err);
      },
    });
  }

  // ------------------------------------------------------------
  // 6) Demande au back-end de démarrer la segmentation
  //    → officialStartTime est mis à Date.now()
  //    → puis on appelle startGlobalTimer()
  // ------------------------------------------------------------
  // dashboard.component.ts
  startSegmentation(officialStartTime?: number): void {
    this.officialStartTime = officialStartTime ?? Date.now();
    // On passe maintenant this.userId comme starterId
    this.sessionService
      .startSegmentation(this.sessionId, this.officialStartTime, this.userId)
      .subscribe({
        next: (res: any) => {
          console.log('Segmentation démarrée (backend confirme) :', res);
          this.startGlobalTimer();
        },
        error: (err: any) => {
          console.error('Erreur startSegmentation :', err);
        },
      });
  }

  stopSegmentation(): void {
    this.sessionService.stopSegmentation(this.sessionId).subscribe({
      next: (res: any) => {
        console.log('Segmentation arrêtée :', res);
        // 1) Arrêter la boucle globale
        if (this.signalUpdateInterval) {
          clearInterval(this.signalUpdateInterval);
          this.signalUpdateInterval = null;
        }
        // 2) Réinitialiser l’état orange sur chaque segment
        this.segments.forEach((seg) => {
          seg.warningFlag = false;
        });
        // 3) Supprimer la prochaine attribution
        this.nextSegment = null;
        // 4) Forcer Angular à rafraîchir la vue
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.error('Erreur stopSegmentation :', err);
      },
    });
  }

  // ------------------------------------------------------------
  // 7) Boucle principale : mise à jour des timers / warning / isVisible puis updateSignalStatus
  // ------------------------------------------------------------
  startGlobalTimer(): void {
    if (!this.officialStartTime) return;
    if (this.signalUpdateInterval) clearInterval(this.signalUpdateInterval);

    this.signalUpdateInterval = setInterval(() => {
      const nowMs = Date.now();

      // 1) Inner timers (vert)
      this.segments.forEach((segment) => {
        if (segment.assigned_to !== this.username) return;

        // démarrage du timer interne une seule fois
        if (
          nowMs >= segment.start_unix &&
          nowMs <= segment.end_unix &&
          !segment.timer
        ) {
          segment.isVisible = true;
          const totalSec = Math.ceil(
            (segment.end_unix - segment.start_unix) / 1000
          );
          segment.timeRemaining = totalSec;
          segment.timer = setInterval(() => {
            if (segment.timeRemaining! > 0) {
              segment.timeRemaining!--;
              this.cdr.detectChanges();
            } else {
              clearInterval(segment.timer!);
              this.autoSaveSubtitle(segment);
            }
          }, 1000);
        }

        // warningFlag (orange)
        const msBefore = segment.start_unix - nowMs;
        if (
          msBefore <= this.warningThresholdSec * 1000 &&
          msBefore > 0 &&
          !segment.warningFlag
        ) {
          segment.warningFlag = true;
        }
      });

      // 2) Vert / orange / rouge (inclut le tick à timeRemaining===0)
      this.updateSignalStatus();

      // 3) Mise à jour UI
      this.cdr.markForCheck();
    }, 1000);
  }

  // ------------------------------------------------------------
  // 8) Détermine activeSegments et nextSegment en fonction de elapsedTime
  // ------------------------------------------------------------
  updateSignalStatus(): void {
    const usernameNorm = (this.username || '').toLowerCase().trim();
    const nowMs = Date.now();

    // seuil d’anticipation (en secondes) configurable
    const warningThresholdMs = this.warningThresholdSec * 1000;

    // 1) Parcours de tous les segments pour ce user
    this.segments.forEach((segment) => {
      if ((segment.assigned_to || '').toLowerCase().trim() !== usernameNorm) {
        return;
      }

      const startUnix = segment.start_unix;
      const endUnix = segment.end_unix;

      // a) WARNING (orange) si on est dans la fenêtre d’anticipation
      const deltaMs = startUnix - nowMs;
      if (
        deltaMs > 0 &&
        deltaMs <= warningThresholdMs &&
        !segment.warningFlag
      ) {
        segment.warningFlag = true;
        console.log(
          `⚠️ Warning pour segment ${
            segment.segment_id
          } (début dans ${Math.ceil(deltaMs / 1000)} s)`
        );
      }

      // b) PASSAGE EN VERT (in_progress) : on lance le timer interne
      if (nowMs >= startUnix && nowMs <= endUnix && !segment.timer) {
        segment.isVisible = true;
        const totalDurationSec = Math.ceil((endUnix - startUnix) / 1000);
        segment.timeRemaining = totalDurationSec;

        segment.timer = setInterval(() => {
          if (segment.timeRemaining! > 0) {
            segment.timeRemaining!--;
            this.cdr.detectChanges();
          } else {
            clearInterval(segment.timer!);
            this.autoSaveSubtitle(segment);
          }
        }, 1000);

        console.log(
          `🚦 Timer interne démarré pour segment ${segment.segment_id}, durée = ${totalDurationSec} s`
        );
      }
    });

    // 2) Recalcul de activeSegments → on garde le tick à 0 pour voir le rouge
    // 2) Recalcul des segments « actifs » pour l’UI (vert ou rouge)
    this.activeSegments = this.segments.filter((s) => {
      const assignedTo = (s.assigned_to || '').toLowerCase().trim();
      // on garde tous les segments dont le timer interne tourne encore
      return assignedTo === usernameNorm && s.isVisible && s.timeRemaining > 0;
    });
    this.activeSegment = this.activeSegments[0] || null;

    // 3) Si pas de segment actif, on cherche nextSegment (orange ou anticipation)
    if (!this.activeSegment) {
      // d’abord un segment déjà en warning
      this.nextSegment = this.segments.find(
        (s) =>
          s.assigned_to === usernameNorm &&
          s.warningFlag &&
          nowMs < s.start_unix
      );
      // sinon un segment dans la fenêtre d’anticipation
      if (!this.nextSegment) {
        this.nextSegment = this.segments.find((s) => {
          const delta = s.start_unix - nowMs;
          return (
            s.assigned_to === usernameNorm &&
            delta > 0 &&
            delta <= warningThresholdMs
          );
        });
      }
    } else {
      this.nextSegment = null;
    }

    console.log(
      `[updateSignalStatus] nowMs=${nowMs}, ` +
        `active=[${this.activeSegments.map((s) => s.segment_id)}], ` +
        `next=${this.nextSegment?.segment_id || 'aucun'}`
    );
  }

  // ------------------------------------------------------------
  // 9) Retourne la couleur du signal pour l’UI : vert / orange / rouge
  // ------------------------------------------------------------
  getCurrentSignal(): 'green' | 'orange' | 'red' {
    if (this.activeSegments.length > 0) return 'green';
    if (this.nextSegment) return 'orange';
    return 'red';
  }

  // ------------------------------------------------------------
  // 10) Temps restant (secondes) avant le prochain segment
  // ------------------------------------------------------------
  getSecondsToNextSegment(): number {
    if (!this.nextSegment) return 0;
    const ms = this.nextSegment.start_unix - this.now;
    return Math.max(Math.ceil(ms / 1000), 0);
  }
  // ------------------------------------------------------------
  // 11) WebSocket events : mises à jour des segments en live
  // ------------------------------------------------------------
  connectToSocket(): void {
    console.log(
      '🔌 connectToSocket() → joinSession via Socket.IO :',
      this.sessionId,
      this.userId,
      this.username
    );

    // 11.1) Quand un utilisateur rejoint
    this.socketService.onUserJoined().subscribe((user) => {
      this.collaborators += 1;
      console.log(`${user.userName} a rejoint la session.`);
    });

    // 11.2) Quand un utilisateur quitte
    this.socketService.onUserLeft().subscribe((user) => {
      this.collaborators -= 1;
      console.log(`${user.userName} a quitté la session.`);
    });

    // 11.3) Mise à jour liste d’utilisateurs
    this.socketService.onUsersUpdated().subscribe((users: string[]) => {
      this.users = users;
      console.log('Utilisateurs connectés :', users);
    });

    // 11.4) Quand le backend renvoie la liste complète après redistribution
    this.socketService
      .onSegmentsRedistributed()
      .subscribe((segments: any[]) => {
        console.log('📩 onSegmentsRedistributed :', segments);
        this.segments = [];

        const sorted = this.mergeSort(segments);
        this.segments = sorted.map((seg: any) => {
          const dur = this.calculateDurationInSeconds(
            seg.start_time,
            seg.end_time
          );
          return {
            ...seg,
            subtitleText: '',
            timeRemaining: dur,
            timer: null,
            isVisible: false,
            warningFlag: false,
            assigned_to: (seg.assigned_to || '').toLowerCase().trim(),
            subtitles: seg.subtitles || [],
            // Note : pas de start_unix ici car on l’envoie depuis le backend au moment de création
          };
        });
        console.log(
          'Segments mis à jour après redistribution :',
          this.segments
        );

        // Forcer un update immédiat
        this.updateSignalStatus();
      });

    // 11.5) Quand un segment est assigné individuellement
    this.socketService.onSegmentAssigned().subscribe((segment: any) => {
      console.log(
        '[SOCKET] "segment-assigned" reçu →',
        segment,
        'start_unix =',
        segment.start_unix
      );

      // 1) Ignorer si déjà présent
      if (this.segments.some((s) => s.segment_id === segment.segment_id)) {
        console.warn(`Segment ${segment.segment_id} déjà présent, ignore.`);
        return;
      }

      // 2) Calculer timeRemaining (secondes)
      const durInSec = this.calculateDurationInSeconds(
        segment.start_time,
        segment.end_time
      );
      const durInMs = durInSec * 1000;
      // 3) Construire newSegment en incluant “start_unix” et “status”
      const newSegment = {
        segment_id: segment.segment_id,
        session_id: segment.session_id,
        start_time: segment.start_time,
        end_time: segment.end_time,
        status: segment.status, // “in_progress”
        assigned_to: (segment.assigned_to || '').toLowerCase().trim(),
        start_unix: segment.start_unix, // timestamp absolu (ms)
        end_unix: segment.start_unix + durInMs, // <-- AJOUTÉ
        subtitleText: '',
        timeRemaining: durInSec,
        timer: null,
        isVisible: false,
        warningFlag: false,
        subtitles: segment.subtitles || [],
      };
      // 4) Ajouter dans this.segments
      this.segments.push(newSegment);
      console.log(
        `   ↪ newSegment ajouté → id=${newSegment.segment_id}, start_unix=${newSegment.start_unix}`
      );

      // 5) Forcer updateSignalStatus immédiat (facultatif)
      this.ngZone.run(() => {
        this.updateSignalStatus();
        console.log(
          `   ← après updateSignalStatus post-WS (elapsed=${
            this.elapsedTime
          }): active=[${this.activeSegments.map((s) => s.segment_id)}], next=${
            this.nextSegment ? this.nextSegment.segment_id : 'aucun'
          }`
        );
      });
    });

    // 11.6) Quand le backend envoie « stream-started »
    this.socketService.onStreamStarted().subscribe(({ startTime }) => {
      console.log('📡 onStreamStarted :', new Date(startTime));
      this.officialStartTime = startTime;
      this.streamStarted = true;
      // Recharger d’abord les segments puis démarrer le timer global
      this.loadSegments(() => {
        this.startGlobalTimer();
      });
    });

    // 11.7) Quand la segmentation est stoppée côté serveur
    // 11.7) Quand la segmentation est stoppée côté serveur
    this.socketService.onSegmentationStopped().subscribe(() => {
      console.log('⛔ Segmentation stoppée depuis le serveur');

      // Arrêter la boucle globale
      if (this.signalUpdateInterval) {
        clearInterval(this.signalUpdateInterval);
        this.signalUpdateInterval = null;
      }

      // Réinitialiser les warningFlags et nextSegment
      this.segments.forEach((seg) => (seg.warningFlag = false));
      this.nextSegment = null;

      // Forcer le refresh de l’UI
      this.cdr.markForCheck();
    });
  }

  // ------------------------------------------------------------
  // 12) Sauvegarde automatique du sous-titre lorsqu'un segment se termine
  // ------------------------------------------------------------
  autoSaveSubtitle(segment: any): void {
    if (!segment.subtitleText.trim()) {
      console.log(
        `Pas de texte pour le segment ${segment.segment_id}, on n’enregistre pas.`
      );
      return;
    }
    console.log(
      `📝 Auto‐save segment ${segment.segment_id} :`,
      segment.subtitleText
    );
    this.sessionService
      .addSubtitle(segment.segment_id, segment.subtitleText, this.userId)
      .subscribe({
        next: (response) => {
          console.log(
            `Réponse backend segment ${segment.segment_id} :`,
            response
          );
          if (response?.subtitle) {
            segment.subtitles.push({
              text: response.subtitle.text,
              created_by: this.userId,
              created_at: response.subtitle.created_at,
            });
          }
          segment.subtitleText = '';
        },
        error: (error) => {
          console.error(
            `Erreur auto‐save segment ${segment.segment_id} :`,
            error
          );
        },
      });
  }

  // ------------------------------------------------------------
  // 13) Utilitaires : calcul durations et parsing HH:MM:SS → secondes
  // ------------------------------------------------------------
  calculateDurationInSeconds(startTime: string, endTime: string): number {
    const [h1, m1, s1] = startTime.split(':').map(Number);
    const [h2, m2, s2] = endTime.split(':').map(Number);
    return h2 * 3600 + m2 * 60 + s2 - (h1 * 3600 + m1 * 60 + s1);
  }

  timeStringToSeconds(timeString: string): number {
    const parts = timeString.split(':').map(Number);
    if (parts.length < 3) return 0;
    const [h, m, s] = parts;
    return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
  }

  // ------------------------------------------------------------
  // 14) Méthode pour générer la largeur de la barre de progression
  //     (évolution du temps restant dans le segment)
  // ------------------------------------------------------------
  calculateWaveWidth(
    timeRemaining: number,
    endTime: string,
    startTime: string
  ): string {
    const totalDuration = this.calculateDurationInSeconds(startTime, endTime);
    // Pourcentage déjà écoulé = (totalDuration - timeRemaining) / totalDuration * 100
    const percentage = ((totalDuration - timeRemaining) / totalDuration) * 100;
    return `${percentage}%`;
  }

  // ------------------------------------------------------------
  // 15) MergeSort pour trier les segments par start_time
  // ------------------------------------------------------------
  mergeSort(array: any[]): any[] {
    if (array.length <= 1) return array;
    const mid = Math.floor(array.length / 2);
    const left = this.mergeSort(array.slice(0, mid));
    const right = this.mergeSort(array.slice(mid));
    return this.merge(left, right);
  }

  private merge(left: any[], right: any[]): any[] {
    const result: any[] = [];
    let i = 0,
      j = 0;
    while (i < left.length && j < right.length) {
      const a = this.timeStringToSeconds(left[i].start_time);
      const b = this.timeStringToSeconds(right[j].start_time);
      if (a <= b) {
        result.push(left[i++]);
      } else {
        result.push(right[j++]);
      }
    }
    return result.concat(left.slice(i)).concat(right.slice(j));
  }

  // ------------------------------------------------------------
  // 16) Gestion d’erreurs dans le player vidéo
  // ------------------------------------------------------------
  onVideoError(): void {
    console.error('La vidéo ne peut pas être chargée :', this.videoUrl);
    alert('Impossible de charger la vidéo.');
  }

  // ------------------------------------------------------------
  // 17) Envoi instantané de la sous-titre en cours via WebSocket
  // ------------------------------------------------------------
  onSubtitleChange() {
    const timestamp = Date.now();
    this.socketService.sendSubtitle({
      text: this.subtitleText,
      videoId: this.videoUrl,
      timestamp,
    });
  }

  // ------------------------------------------------------------
  // 18) Exporter les sous-titres au format SRT
  // ------------------------------------------------------------
  onExportSrt(): void {
    console.log('onExportSrt appelé');
    this.sessionService.exportSrt(this.sessionId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session-${this.sessionId}.srt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Erreur export SRT :', err);
        alert('Impossible d’exporter les sous-titres.');
      },
    });
  }

  // ------------------------------------------------------------
  // 19) Déconnexion / déloggage
  // ------------------------------------------------------------
  onLogout() {
    this.socketService.leaveVideoSession({
      userId: this.userId,
      sessionId: this.sessionId,
    });
    this.sessionService
      .handleUserDisconnection(this.userId, this.sessionId)
      .subscribe();
    this.authService.logout().subscribe({
      next: () => {
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('sessionId');
        this.router.navigate(['/login-page']);
      },
      error: (error) => {
        console.error('Erreur déconnexion :', error);
      },
    });
  }

  // ------------------------------------------------------------
  // 20) Cleanup au destroy
  // ------------------------------------------------------------
  ngOnDestroy() {
    if (this.signalUpdateInterval) {
      clearInterval(this.signalUpdateInterval);
      this.signalUpdateInterval = null;
    }
    this.socketService.leaveVideoSession({
      userId: this.userId,
      sessionId: this.sessionId,
    });
    this.sessionService
      .handleUserDisconnection(this.userId, this.sessionId)
      .subscribe();
    this.nowSub.unsubscribe();
  }

  // ------------------------------------------------------------
  // 21) Event quand l’utilisateur commence à taper (UI)
  // ------------------------------------------------------------
  onUserTyping(segment: any) {
    if (!this.hasStartedTyping) {
      this.hasStartedTyping = true;
      console.log(
        '🖱️ L’utilisateur a cliqué sur la zone de texte, démarrage des timers.'
      );
      // Optionnel : démarrer d’autres timers si besoin
    }
  }

  onEnregistrerSousTitre() {
    // Sécurité : évite de sauvegarder si pas de segment actif ou zone vide
    if (!this.activeSegment || !this.subtitleText.trim()) return;

    // Tu peux garder ou non l'auto-save, ici bouton manuel
    this.sessionService
      .addSubtitle(
        this.activeSegment.segment_id,
        this.subtitleText,
        this.userId
      )
      .subscribe({
        next: (response) => {
          if (response?.subtitle) {
            this.activeSegment.subtitles.push({
              text: response.subtitle.text,
              created_by: this.userId,
              created_at: response.subtitle.created_at,
            });
          }
          this.subtitleText = '';
        },
        error: (error) => {
          console.error(`Erreur d'enregistrement du sous-titre :`, error);
        },
      });
  }
}
