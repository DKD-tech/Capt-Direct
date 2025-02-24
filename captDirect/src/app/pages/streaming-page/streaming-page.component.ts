import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { StreamingComponent } from '../../components/streaming/streaming.component';

@Component({
  selector: 'app-streaming-page',
  standalone: true,
  imports: [StreamingComponent],
  templateUrl: './streaming-page.component.html',
  styleUrl: './streaming-page.component.scss',
})
export class StreamingPageComponent {
  constructor(private router: Router) {}
}
