import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-streaming-player',
  standalone: true,
  imports: [],
  templateUrl: './streaming-player.component.html',
  styleUrl: './streaming-player.component.scss',
})
export class StreamingPlayerComponent implements OnInit {
  videoUrl: string = '';
  subtitles: any[] = [];
  currentSubtitle: string = '';

  ngOnInit(): void {
    this.loadVideo();
    this.loadSubtitles();
  }
  loadVideo(): void {
    this.videoUrl = localStorage.getItem('currentVideoUrl') || '';
  }

  loadSubtitles(): void {
    const srtContent = localStorage.getItem('currentSubtitles') || '';
    this.subtitles = this.parseSRT(srtContent);
  }

  parseSRT(data: string): any[] {
    const regex = /(\d+)\s+([\d:,]+) --> ([\d:,]+)\s+([\s\S]*?)(?=\n\n|\n*$)/g;
    let subtitles = [];
    let match;

    while ((match = regex.exec(data)) !== null) {
      subtitles.push({
        start: this.timeToSeconds(match[2]),
        end: this.timeToSeconds(match[3]),
        text: match[4].trim(),
      });
    }
    return subtitles;
  }

  timeToSeconds(time: string): number {
    const parts = time.split(':');
    return (
      parseInt(parts[0]) * 3600 +
      parseInt(parts[1]) * 60 +
      parseFloat(parts[2].replace(',', '.'))
    );
  }

  updateSubtitle(currentTime: number): void {
    for (let sub of this.subtitles) {
      if (currentTime >= sub.start && currentTime <= sub.end) {
        this.currentSubtitle = sub.text;
        return;
      }
    }
    this.currentSubtitle = '';
  }
}
