import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs';
import { from } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  constructor(private socket: Socket) {}

  // Méthodes pour envoyer des événements
  joinVideoSession(data: {
    userId: string;
    userName: string;
    videoId: string;
  }) {
    this.socket.emit('joinVideoSession', data);
  }

  leaveVideoSession(data: { userId: string; videoId: string }) {
    this.socket.emit('leaveVideoSession', data);
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
}
