import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private wordAddedSubject = new BehaviorSubject<any>(null); // 🔹 Stocke le dernier mot ajouté

  constructor(private socket: Socket) {
    this.socket.on("connect", () => {
      console.log("✅ CONNECTÉ À SOCKET.IO !");
    });
  
    // Vérification immédiate après la connexion
    setTimeout(() => {
      console.log("📡 Test d'écoute : Demande au serveur de renvoyer un test.");
      this.socket.emit("test-connection");
    }, 3000);
  
    // 🔍 Vérification de `word_added`
    this.socket.on("word_added", (data: any) => {
      console.log("🔥 DEBUG DIRECT SOCKET.IO reçu :", data);
    });
  }
  
  joinSession(session_id: number, username: string, user_id: number): void {
    console.log("📢 [FRONTEND] Tentative de rejoindre la session :", { session_id, username, user_id });
    this.socket.emit("join-session", { session_id, username, user_id });
  
    this.socket.on("update-users", (users: string[]) => {  // 👈 Ajoute le type ici
      console.log("✅ [FRONTEND] Utilisateurs mis à jour :", users);
    });
  }
  
  

  // 🔹 Vérifier la réception de `word_added`
  onSubtitleAdded(): Observable<any> {
    return this.socket.fromEvent('subtitle_added');
}


  // 🔹 Quitter une session
  leaveVideoSession(data: { userId: number; sessionId: number }) {
    this.socket.emit('leaveVideoSession', data);
  }

  sendSubtitle(data: { text: string; sessionId: number; timestamp: number }) {
    console.log("📡 Envoi du sous-titre via socket :", data);
    this.socket.emit('subtitle_update', data);  // Vérifie le bon événement côté backend
  }
  

  


  
  // onSegmentAssigned(callback: (segment: any) => void) {
  //   this.socket.on('segment-assigned', callback);
  // }
  

  // Recevoir les utilisateurs connectés
  getUsers(): Observable<string[]> {
    return new Observable((observer) => {
      this.socket.on('update-users', (users: string[]) => {
        observer.next(users);
      });
    });
  }

  // Écouter la mise à jour de la liste des utilisateurs connectés
  onUsersUpdated(): Observable<string[]> {
    return this.socket.fromEvent<string[]>('update-users');
  }

  // Écouter les mises à jour des segments redistribués
  onSegmentsRedistributed(): Observable<any[]> {
    return this.socket.fromEvent<any[]>('segments-redistributed');
  }

  // Mises à jour des segments redistribués
  onSegmentsUpdated(): Observable<any> {
    return this.socket.fromEvent('segments-updated');
  }
  //sendSubtitle(subtitle: { text: string; videoId: string; timestamp: number }) {
   // this.socket.emit('editSubtitle', subtitle);
  //}

  deleteSubtitle(data: { subtitleId: string; videoId: string }) {
    this.socket.emit('deleteSubtitle', data);
  }

  playVideo(data: { videoId: string; currentTime: number }) {
    this.socket.emit('playVideo', data);
  }

  pauseVideo(data: { videoId: string; currentTime: number }) {
    this.socket.emit('pauseVideo', data);
  }

  seekVideo(data: { videoId: string; newTime: number }) {
    this.socket.emit('seekVideo', data);
  }

  userTyping(data: { userId: string; videoId: string }) {
    this.socket.emit('userTyping', data);
  }

  sendNotification(data: { type: string; message: string; userId: string }) {
    this.socket.emit('notification', data);
  }

  onSubtitleUpdate(): Observable<any> {
    return this.socket.fromEvent('updateSubtitle');
  }
  
  // Méthodes pour écouter des événements
  //onSubtitleUpdate(): Observable<{
  //  text: string;
    //videoId: string;
    //timestamp: number;
  //}> {
  //  return this.socket.fromEvent('updateSubtitle');
  //}

  // onSegmentsUpdated(): Observable<any[]> {
  //   return this.socket.fromEvent<any[]>('updateSegments');
  // }
  onSocketConnect(): Observable<void> {
    return new Observable(observer => {
      this.socket.on("connect", () => {
        console.log("✅ CONNECTÉ À SOCKET.IO !");
        observer.next();
      });
    });
  }
  
  onUserJoined(): Observable<{ userId: string; userName: string }> {
    return this.socket.fromEvent('userJoined');
  }

  onUserLeft(): Observable<{ userId: string; userName: string }> {
    return this.socket.fromEvent('userLeft');
  }

  onPlayVideo(): Observable<{ currentTime: number }> {
    return this.socket.fromEvent('playVideo');
  }

  onPauseVideo(): Observable<{ currentTime: number }> {
    return this.socket.fromEvent('pauseVideo');
  }

  onSeekVideo(): Observable<{ newTime: number }> {
    return this.socket.fromEvent('seekVideo');
  }

  onUserTyping(): Observable<{ userId: string }> {
    return this.socket.fromEvent('userTyping');
  }
 ;
  
  
  
  // 🔹 Écouter un sous-titre finalisé
onSubtitleFinalized(): Observable<{ segment_id: number; finalText: string }> {
  return this.socket.fromEvent('subtitle_finalized');
}

// 🔹 Écouter les mots reçus en temps réel
onWordReceived(): Observable<any> {
  return new Observable(observer => {
    this.socket.on("word_added", (data: any) => {  // Ajout de ": any"
      console.log("✅ SOCKET SERVICE : Événement `word_added` reçu :", data);
      observer.next(data);
    });
  });
}



  onNotification(): Observable<{
    type: string;
    message: string;
    userId: string;
  }> {
    return this.socket.fromEvent('notification');
  }
  public listen(eventName: string): Observable<any> {
    return new Observable(observer => {
      this.socket.on(eventName, (data: any) => {
        console.log(`📡 Événement reçu : ${eventName}`, data);
        observer.next(data);
      });
    });
  }
  
  removeWord(segmentId: number, word: string): void {
    console.log(`🗑️ [Socket] Suppression du mot "${word}" pour le segment ${segmentId}`);
    
    // 🔹 Émettre un événement Socket.IO pour informer le frontend
    this.socket.emit("remove_word", { segment_id: segmentId, word: word });
}


  
}