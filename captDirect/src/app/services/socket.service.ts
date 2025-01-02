import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  constructor(private socket: Socket) {}

  // Connexion à une session vidéo
  joinVideoSession(data: { userId: string; userName: string; videoId: string }) {
    this.socket.emit('joinVideoSession', data);
  }

  leaveVideoSession(data: { userId: string; videoId: string }) {
    this.socket.emit('leaveVideoSession', data);
  }

  // Envoi d'un sous-titre au serveur
  sendSubtitle(subtitle: {
    text: string;
    startTime: number;
    endTime: number;
    videoId: string;
    userId: string;
  }) {
    console.log('Envoi du sous-titre au serveur :', subtitle);
    this.socket.emit('editSubtitle', subtitle);
  }

  // Suppression d'un sous-titre
  deleteSubtitle(data: { subtitleId: string; videoId: string }) {
    this.socket.emit('deleteSubtitle', data);
  }

  // Gestion de la lecture vidéo
  playVideo(data: { videoId: string; currentTime: number }) {
    this.socket.emit('playVideo', data);
  }

  pauseVideo(data: { videoId: string; currentTime: number }) {
    this.socket.emit('pauseVideo', data);
  }

  seekVideo(data: { videoId: string; newTime: number }) {
    this.socket.emit('seekVideo', data);
  }

  // Notifications utilisateur
  userTyping(data: { userId: string; videoId: string }) {
    this.socket.emit('userTyping', data);
  }

  sendNotification(data: { type: string; message: string; userId: string }) {
    this.socket.emit('notification', data);
  }

  // Écouter les sous-titres confirmés par le backend
  onSubtitleConfirmed(): Observable<{
    text: string;
    startTime: number;
    endTime: number;
    videoId: string;
    userId: string;
  }> {
    return this.socket.fromEvent('subtitleConfirmed');
  }

  // Écouter les mises à jour des sous-titres en temps réel
  onSubtitleUpdate(): Observable<{
    text: string;
    startTime: number;
    endTime: number;
    videoId: string;
    userId: string;
  }> {
    return this.socket.fromEvent('updateSubtitle');
  }

  // Écouter les événements de session
  onUserJoined(): Observable<{ userId: string; userName: string }> {
    return this.socket.fromEvent('userJoined');
  }

  onUserLeft(): Observable<{ userId: string; userName: string }> {
    return this.socket.fromEvent('userLeft');
  }

  // Écouter les événements de contrôle vidéo
  onPlayVideo(): Observable<{ videoId: string; currentTime: number }> {
    return this.socket.fromEvent('playVideo');
  }

  onPauseVideo(): Observable<{ videoId: string; currentTime: number }> {
    return this.socket.fromEvent('pauseVideo');
  }

  onSeekVideo(): Observable<{ videoId: string; newTime: number }> {
    return this.socket.fromEvent('seekVideo');
  }

  // Notifications utilisateur
  onUserTyping(): Observable<{ userId: string }> {
    return this.socket.fromEvent('userTyping');
  }

  onNotification(): Observable<{ type: string; message: string; userId: string }> {
    return this.socket.fromEvent('notification');
  }
}
