import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; // Import du CommonModule
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import validator from 'validator';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule], // Ajoutez CommonModule ici
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  username: string = '';
  email: string = '';
  password: string = '';
  showErrorPopup: boolean = false;
  errorMessage: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  onRegister() {
    console.log('Email:', this.email);
    console.log('Password:', this.password);
    console.log('Username:', this.username);

    if (!validator.isEmail(this.email)) {
      this.showErrorPopup = true;
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }

    if (this.password.length <= 8) {
      this.showErrorPopup = true;
      this.errorMessage = 'Password must be at least 8 characters long.';
      return;
    }
    const role = 'editor';
    this.authService
      .signup(this.email, this.password, this.username, role)
      .subscribe({
        next: (response) => {
          console.log('Signup response:', response); // Vérifiez si cette ligne s'affiche et montre le token
          if (response && response.token) {
            alert('Signup successful! Please log in.');
            this.router.navigate(['/login-page']);
          } else {
            this.showErrorPopup = true;
            this.errorMessage = 'Unexpected response from server.';
          }
        },
        error: (error) => {
          console.error('Signup error:', error);
          this.showErrorPopup = true;

          // Vérifiez si `error.error` est défini et est un objet JSON
          if (
            error.error &&
            typeof error.error === 'object' &&
            error.error.message
          ) {
            this.errorMessage = error.error.message;
          } else {
            this.errorMessage = 'Signup failed. Please try again.';
          }
        },
      });
  }

  onLogin() {
    this.router.navigate(['/login-page']);
  }

  closePopup() {
    this.showErrorPopup = false;
  }
}
