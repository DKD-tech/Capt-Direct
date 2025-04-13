import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { StreamingPlayerComponent } from '../../components/streaming-player/streaming-player.component';

@Component({
  selector: 'app-streaming-player-page',
  standalone: true,
  imports: [StreamingPlayerComponent],
  templateUrl: './streaming-player-page.component.html',
  styleUrl: './streaming-player-page.component.scss',
})
export class StreamingPlayerPageComponent {
  constructor(private router: Router) {}
}
