import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
<<<<<<< HEAD
import { Router } from '@angular/router';
=======
import { CommonModule } from '@angular/common'; // Import du CommonModule
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import validator from 'validator';
>>>>>>> merge

@Component({
  selector: 'app-register',
  standalone: true,
<<<<<<< HEAD
  imports: [FormsModule],
=======
  imports: [FormsModule, CommonModule], // Ajoutez CommonModule ici
>>>>>>> merge
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
<<<<<<< HEAD
  constructor(private router: Router) {}

  onRegister() {
    // Logique d'inscription ici (par exemple, envoyer les données du formulaire à une API)
    console.log('Inscription effectuée');
    // Après l'inscription, rediriger vers la page de connexion ou un tableau de bord
    this.router.navigate(['/dashboard-page']);
  }
  onLogin() {
    this.router.navigate(['/login-page']);
  }
=======
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
>>>>>>> merge
}
