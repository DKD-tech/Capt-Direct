import { Component, OnInit } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { SidebarService } from '../../services/sidebar.service';
import { CommonModule } from '@angular/common';  // Import CommonModule
import { MatIconModule } from '@angular/material/icon';  // Import MatIconModule

@Component({
  selector: 'app-side-bar',
  standalone: true,
  imports: [CommonModule, MatIconModule],  // Add these modules here
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.scss'],  // Fixed typo from styleUrl to styleUrls
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: 0 })),
      transition(':enter, :leave', [
        animate(300, style({ opacity: 1 })),
      ]),
    ]),
  ],
})
export class SideBarComponent implements OnInit {

  isSidebarVisible = true;
  isSubmenuOpen = false;
  isDashboardSelected = false;

  constructor(private sidebarService: SidebarService) {}

  ngOnInit() {
    this.sidebarService.sidebarVisibility$.subscribe((isVisible) => {
      console.log(isVisible)
      this.isSidebarVisible = isVisible;
    });
  }

  toggleSidebar() {
    this.isSidebarVisible = !this.isSidebarVisible;
    this.sidebarService.toggleSidebar(); // Toggle sidebar state
  }

  toggleSubmenu() {
    this.isSubmenuOpen = !this.isSubmenuOpen;
  }

  selectDashboard() {
    this.isDashboardSelected = true;
  }
}
