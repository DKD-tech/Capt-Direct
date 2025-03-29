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
  sessionId: number = 23;
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
    //this.loadLiveSubtitles();
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

    //this.socketService.onWordAdded().subscribe((data) => {
     // if (!data?.word || !data.isValid) {
      //    console.warn("⚠️ Mot rejeté :", data);
     //     return;
     // }
  
     // this.liveSubtitles.push({ text: data.word });
  
      //if (this.liveSubtitles.length > this.maxVisibleSubtitles) {
       //   setTimeout(() => {
       //       this.liveSubtitles.shift();
         //     this.cdRef.detectChanges();
         // }, 1500);
     // }
      //this.cdRef.detectChanges();
  //});
  
  
    
    //this.socketService.onWordReceived().subscribe((data: any) => {
     //if (!data?.word) {
      // console.warn("⚠️ Mot reçu invalide :", data);
      // return;
    //}
    
       //🔹 Ajout ou concaténation du mot dans liveSubtitles
     // if (this.liveSubtitles.length > 0) {
     // this.liveSubtitles[this.liveSubtitles.length - 1].text += " " + data.word;
     // } else {
      //this.liveSubtitles.push({ text: data.word });
    // }
    
    // this.cdRef.detectChanges(); // 🔄 Mise à jour de l'affichage
   // });
    
    // Écoute de la finalisation des sous-titres
//this.socketService.onSubtitleFinalized().subscribe(({ segment_id, finalText }) => {
  //console.log("🔴 [SOCKET] `subtitle_finalized` reçu :", { segment_id, finalText });
  //const segment = this.segments.find((s) => s.segment_id === segment_id);
  //if (segment) {
   // segment.subtitleText = finalText;

    // ✅ Mettre à jour l'état du segment pour désactiver la saisie
   //segment.isFinalized = true;
   //segment.isDisabled = true;

    // 🔄 Mise à jour du DOM pour refléter le changement
   //this.cdRef.detectChanges();
   // console.log(`✅ Sous-titre finalisé pour segment ${segment_id}, la saisie est désormais bloquée.`);
  //}
//});

    
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

 // onSubtitleInput(event: KeyboardEvent, segment: any) {
   // if (segment.isFinalized) {
   //     console.warn(`⚠️ Impossible d'envoyer : le segment ${segment.segment_id} est déjà finalisé.`);
   //     return;
   // }

   // if (event.key === ' ') {  
     //   event.preventDefault(); 

      //  const words = segment.subtitleText.trim().split(' ');
      //  const lastWord = words.pop(); 

       // if (lastWord) {
        //    console.log("📤 [DEBUG] Envoi du mot :", lastWord, "pour segment :", segment);

            // ✅ Envoyer uniquement après validation
          //  this.sessionService.addWord(segment.segment_id, lastWord, this.userId).subscribe({
               // next: (response: any) => {
                 //   console.log("✅ [API] Mot validé :", response);
                 //   if (response.word) {
                  //      this.socketService.sendWord(segment.segment_id, response.word, this.userId);
                        // ✅ Ajouter à l'affichage seulement après validation
                  //      this.liveSubtitles.push({ text: response.word });
                 //   }
               // },
               // error: (error) => {
              //      console.warn(`🚨 Le mot "${lastWord}" a été rejeté par le backend.`);
             //   }
           // });
       // }

       // segment.subtitleText = words.join(' '); 
  //  }
//}

  


loadSegments(): void {
  this.sessionService.getSegmentsWithSession(this.sessionId).subscribe({
      next: (response) => {
          console.log("📦 Segments chargés :", response.segments);

          this.segments = response.segments.map((segment: any) => ({
              ...segment,
              subtitleText: '',
              timeRemaining: this.calculateDurationInSeconds(segment.start_time, segment.end_time),
              isDisabled: false,
              isFinalized: segment.status === 'finalized',
              isBlinking: false,
              isActive: false,
              assigned_to: segment.assigned_to || 'Utilisateur inconnu',
              subtitles: segment.subtitles || [],  // Vérifie que `subtitles` existe bien
          }));

          console.log("🚀 [DEBUG] Segments après traitement :", this.segments);
      },
      error: (error) => {
          console.error("❌ Erreur lors du chargement des segments :", error);
      },
  });
}

  addSubtitle(segment: any): void {
    if (!segment.segment_id || !segment.subtitleText.trim()) {
      console.error("❌ [ERREUR] Segment ID manquant ou texte vide !", segment);
      return;
    }
     
    const sendTime = Date.now(); // 🕒 Capture le temps d'envoi

    console.log(`📡 [DEBUG] Envoi du sous-titre à ${sendTime}:`, segment.subtitleText, "pour segment :", segment.segment_id);
    console.log("📡 [DEBUG] Envoi du sous-titre :", segment.subtitleText, "pour segment :", segment.segment_id);
  
    this.subtitleService.addSubtitle(segment.segment_id, segment.subtitleText, this.userId).subscribe({
      next: (response) => {
        console.log("✅ [API] Sous-titre ajouté avec succès :", response);
        segment.subtitleText = ''; // Nettoyer le champ après l'envoi
      },
      error: (error) => {
        console.error("❌ [ERREUR] Impossible d'ajouter le sous-titre :", error);
      }
    });
  }
  


  finalizeSubtitle(segment: any): void {
    if (!segment.segment_id || !this.userId) {
      console.error("❌ Erreur : segment_id ou userId manquant !", { segment_id: segment.segment_id, userId: this.userId });
      return;
    }
  
    // 🔹 Vérification : S'il n'y a pas de texte, on ne finalise pas
    if (!segment.subtitleText.trim()) {
      console.warn(`⚠️ Aucun texte à finaliser pour le segment ${segment.segment_id}.`);
      return;
    }
  
    console.log(`📡 [FINALISATION] Envoi du sous-titre final pour segment ${segment.segment_id} :`, segment.subtitleText);
  
    this.subtitleService.finalizeSubtitle(segment.segment_id, this.userId).subscribe({
      next: (response) => {
        console.log(`✅ Sous-titre finalisé pour le segment ${segment.segment_id} :`, response);
  
        segment.isFinalized = true;
        segment.isDisabled = true; 
        segment.subtitleText = ""; // Nettoyer l'affichage après finalisation
  
        this.cdRef.detectChanges();
      },
      error: (error) => {
        console.error(`❌ Erreur lors de la finalisation du segment ${segment.segment_id} :`, error);
        segment.isDisabled = false;
      }
    });
  }
  

  connectToSocket(): void { 
    // ✅ Réception d'un segment finalisé en temps réel
    this.socketService.onSubtitleFinalized().subscribe((data: any) => { 
      const { segment_id, finalText } = data;
      const finalizedTime = data.finalizedTime ?? Date.now(); // Utilise Date.now() si non défini

      console.log("🔴 [SOCKET] `subtitle_finalized` reçu :", { segment_id, finalText });

      const receiveTime = Date.now(); // 🕒 Capture du moment où le frontend reçoit le sous-titre


    console.log(`🔴 [SOCKET] Sous-titre reçu à ${receiveTime} pour segment ${segment_id}, texte: "${finalText}"`);
    console.log(`⏳ Temps total (saisie -> affichage) : ${receiveTime - finalizedTime}ms`);

        
        const segment = this.segments.find((s) => s.segment_id === segment_id);
        if (segment) {
            segment.subtitleText = finalText;
            segment.status = 'finalized';
            segment.isDisabled = true;
            this.finalizedSubtitles.push({ text: finalText });
            this.cdRef.detectChanges();
            console.log(`✅ Segment ${segment_id} finalisé et ajouté à la transcription.`);
        }
    });
    this.socketService.listen("segment_assigned").subscribe((data: any) => {
      console.log("📢 Événement reçu : segment_assigned", data);
  
      // ✅ Toujours re-trier les segments avant d'activer le prochain
      this.segments.sort((a, b) => this.convertTimeToSeconds(a.start_time) - this.convertTimeToSeconds(b.start_time));
  
      const assignedSegment = this.segments.find(s => s.segment_id === data.segment_id);
      if (assignedSegment) {
          console.log("✅ Nouveau segment assigné :", assignedSegment);
          assignedSegment.isActive = true; 
          this.cdRef.detectChanges(); 
  
          // ✅ Lancer le timer automatiquement
          this.startTimerForSegment(assignedSegment);
      }
  });
  
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
        return; 
    }

    if (segment.timer) return; 

    console.log(`🚀 Démarrage du timer pour le segment ${segment.segment_id}`);
    segment.timeRemaining += 3;

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

            // ✅ Avant de finaliser, on ajoute le sous-titre dans Redis
            if (segment.subtitleText.trim()) {
                console.log(`📤 [FRONTEND] Envoi du sous-titre pour segment ${segment.segment_id} :`, segment.subtitleText);
                this.sessionService.addSubtitle(segment.segment_id, segment.subtitleText, this.userId).subscribe({
                    next: (response) => {
                        console.log(`✅ Sous-titre ajouté pour le segment ${segment.segment_id} :`, response);

                        // ✅ Finalisation automatique après ajout du sous-titre
                        this.subtitleService.finalizeSubtitle(segment.segment_id, this.userId).subscribe({
                            next: (finalResponse) => {
                                console.log(`✅ Segment ${segment.segment_id} finalisé avec succès :`, finalResponse);
                            },
                            error: (finalError) => {
                                console.error(`❌ Erreur lors de la finalisation du segment ${segment.segment_id} :`, finalError);
                            }
                        });

                    },
                    error: (error) => {
                        console.error(`❌ Erreur lors de l'ajout du sous-titre pour ${segment.segment_id} :`, error);
                    }
                });
            } else {
                console.warn(`⚠️ Aucun texte saisi pour le segment ${segment.segment_id}, pas d'envoi.`);
            }
        }
    }, 1000);
}

  /**
   * Active le prochain segment basé sur `start_time`.
   */
  activateNextSegment(currentSegment: any): void {
    const currentIndex = this.segments.findIndex(seg => seg.segment_id === currentSegment.segment_id);
  
    if (currentIndex !== -1 && currentIndex < this.segments.length - 1) {
        const nextSegment = this.segments[currentIndex + 1];
        console.log(`Segment suivant activé : Segment ID ${nextSegment.segment_id}`);

        // ✅ Ajout de la marge de 5 secondes pour tous les segments activés
        nextSegment.timeRemaining += 3;

        nextSegment.isBlinking = true;
        setTimeout(() => {
            nextSegment.isBlinking = false;
            nextSegment.isActive = true;
            console.log(`⏳ Timer démarré pour le segment ${nextSegment.segment_id}`);
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
  onSubtitleChange(segment: any) {
    if (!segment.subtitleText.trim()) {
      console.warn("⚠️ Aucun texte à envoyer.");
      return;
    }
  
    const timestamp = Date.now();
  
    this.socketService.sendSubtitle({
      text: segment.subtitleText,
      sessionId: this.sessionId,  // Ajoute la session en cours
      timestamp,
    });
  
    console.log(`📡 Sous-titre envoyé pour le segment ${segment.segment_id}`);
  }
  

  //handleWordInput(event: KeyboardEvent, segment: any): void {
  //  if (event.key === ' ') { // Détection de l'espace
  //    const words = segment.subtitleText.trim().split(' ');
   //   const lastWord = words[words.length - 1];
  
   //   if (lastWord) {
     //   this.socketService.sendWord(segment.segment_id, lastWord, this.userId);
     //   console.log(`Mot envoyé : "${lastWord}" pour le segment ${segment.segment_id}`);
    //  }
   // }
 // }
  
  finalizeSegmentSubtitle(segment: any): void {
    if (!segment.segment_id || !this.userId) {
      console.error("❌ Erreur : segment_id ou userId manquant !", { segment_id: segment.segment_id, userId: this.userId });
      return;
    }
  
    // 🔹 Désactiver la zone de texte pour ce segment
    segment.isDisabled = true;
  
    // ✅ Envoyer la finalisation au serveur
    this.subtitleService.finalizeSubtitle(segment.segment_id, this.userId).subscribe({
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
  
      if (!data?.text) {
        console.warn("⚠️ Mot reçu invalide :", data);
        return;
      }
  
      // ✅ Vérifie s'il existe déjà une ligne active
      if (this.liveSubtitles.length > 0) {
        // Ajoute le nouveau mot à la dernière ligne existante
        this.liveSubtitles[this.liveSubtitles.length - 1].text += " " + data.text;
      } else {
        // Si c'est le premier mot, crée une ligne
        this.liveSubtitles.push({ text: data.text });
      }
  
      // ✅ Empêcher une phrase trop longue
      const maxChars = 100; // Limite à 100 caractères
      if (this.liveSubtitles[this.liveSubtitles.length - 1].text.length > maxChars) {
        this.liveSubtitles[this.liveSubtitles.length - 1].text = 
          this.liveSubtitles[this.liveSubtitles.length - 1].text.slice(-maxChars);
      }
  
      this.cdRef.detectChanges(); // 🔄 Met à jour l'affichage
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
