import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  // imports: [RouterOutlet],
  imports: [HeaderComponent],
  templateUrl: './components/header/header.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'captDirect';
}
