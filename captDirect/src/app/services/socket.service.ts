import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs';
import { from } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  constructor(private socket: Socket) {
    // this.socket.ioSocket.on('connect', () => {
    //   console.log('[SocketService] reconnecté au serveur');

    //   const sessionId = localStorage.getItem('sessionId');
    //   const userId = localStorage.getItem('userId');
    //   const username = localStorage.getItem('username');

    //   console.log('[SocketService] LocalStorage récupéré :', {
    //     sessionId,
    //     userId,
    //     username,
    //   });

    //   if (sessionId && userId && username) {
    //     this.joinSession(+sessionId, username, +userId);
    //   }
    // });
    this.socket.ioSocket.on('connect', () => {
      console.log('[SocketService] connecté au serveur');

      const sessionId = localStorage.getItem('sessionId');
      const userId = localStorage.getItem('userId');
      const username = localStorage.getItem('username');

      if (sessionId && userId && username) {
        this.joinSession(+sessionId, username.trim(), +userId);
      }
    });
  }
  onSegmentationStopped(): Observable<void> {
    return new Observable((observer) => {
      this.socket.on('segmentation-stopped', () => {
        console.log('🛑 Segmentation arrêtée (event reçu du serveur)');
        observer.next();
      });
    });
  }
  // Rejoindre une session
  joinSession(session_id: number, username: string, user_id: number): void {
    console.log('[SocketService] joinSession envoyé avec :', {
      session_id,
      username,
      user_id,
    });
    this.socket.emit('join-session', { session_id, username, user_id });
  }
  // onSegmentAssigned(callback: (segment: any) => void) {
  //   this.socket.on('segment-assigned', callback);
  // }
  // Quitter une session
  leaveVideoSession(data: { userId: number; sessionId: number }) {
    this.socket.emit('leaveVideoSession', data);
  }

  waitForConnection(): Promise<void> {
    return new Promise((resolve) => {
      if (this.socket.ioSocket.connected) {
        return resolve();
      }

      this.socket.ioSocket.once('connect', () => {
        console.log('[SocketService] ✅ connect (waitForConnection)');
        resolve();
      });
    });
  }

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
  sendSubtitle(subtitle: { text: string; videoId: string; timestamp: number }) {
    this.socket.emit('editSubtitle', subtitle);
  }

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

  // Méthodes pour écouter des événements
  onSubtitleUpdate(): Observable<{
    text: string;
    videoId: string;
    timestamp: number;
  }> {
    return this.socket.fromEvent('updateSubtitle');
  }

  // onSegmentsUpdated(): Observable<any[]> {
  //   return this.socket.fromEvent<any[]>('updateSegments');
  // }

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

  onNotification(): Observable<{
    type: string;
    message: string;
    userId: string;
  }> {
    return this.socket.fromEvent('notification');
  }

  //  Quand le flux démarre
  onStreamStarted(): Observable<{ startTime: number }> {
    return this.socket.fromEvent<{ startTime: number }>('stream-started');
  }

  // Temps écoulé depuis le début du flux
  onElapsedTime(): Observable<{ elapsedTime: number }> {
    return this.socket.fromEvent<{ elapsedTime: number }>('elapsedTime');
  }
}
