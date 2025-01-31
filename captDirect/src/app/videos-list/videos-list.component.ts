import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-videos-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './videos-list.component.html',
  styleUrl: './videos-list.component.scss'
})
export class VideosListComponent {
  videos = [
    { title: 'Live Stream 1', channel: 'Channel A', views: '10K watching', time: '', isLive: true },
    { title: 'Video 2', channel: 'Channel B', views: '500K views', time: '2 days ago', isLive: false },
    { title: 'Live Stream 3', channel: 'Channel C', views: '25K watching', time: '', isLive: true },
    { title: 'Video 4', channel: 'Channel D', views: '1M views', time: '1 week ago', isLive: false }
  ];
}
