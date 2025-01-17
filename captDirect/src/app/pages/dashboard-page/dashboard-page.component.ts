import { Component } from '@angular/core';
import { DashboardComponent } from '../../components/dashboard/dashboard.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [DashboardComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent {
  constructor(private router: Router) {}
}
