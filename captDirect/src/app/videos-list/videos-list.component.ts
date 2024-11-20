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
    { title: 'Video 1', channel: 'Channel A', views: '1M views', time: '1 day ago' },
    { title: 'Video 2', channel: 'Channel B', views: '500K views', time: '2 days ago' },
    { title: 'Video 3', channel: 'Channel C', views: '200K views', time: '3 days ago' },
    // Add more video data as needed
  ];

}
