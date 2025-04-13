<<<<<<< HEAD
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
=======
import { AuthService } from './../../services/auth/auth.service';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common'; // Import de CommonModule
import validator from 'validator';
>>>>>>> merge

@Component({
  selector: 'app-login',
  standalone: true,
<<<<<<< HEAD
  imports: [FormsModule],
=======
  imports: [FormsModule, CommonModule], // Ajout de CommonModule aux imports
>>>>>>> merge
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
<<<<<<< HEAD
  constructor(private router: Router) {}

  onLogin() {
    console.log('Connexion effectuée');
    this.router.navigate(['/dashboard-page']);
=======
  email: string = '';
  password: string = '';
  showErrorPopup: boolean = false;
  errorMessage: string = '';

  constructor(private router: Router, private authService: AuthService) {}

  onLogin() {
    console.log('Email:', this.email);
    console.log('Password:', this.password);

    if (!validator.isEmail(this.email)) {
      this.showErrorPopup = true;
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }

    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        if (response) {
          this.router.navigate(['/dashboard-page']);
        } else {
          this.showErrorPopup = true;
          this.errorMessage = 'Email ou Mot de passe incorrect.';
        }
      },
      error: (error) => {
        console.error('Erreur de connexion', error);
        this.showErrorPopup = true;
        this.errorMessage =
          error.error.message || 'Login failed. Please check your credentials.';
      },
    });
>>>>>>> merge
  }

  onRegister() {
    this.router.navigate(['/register-page']);
  }
<<<<<<< HEAD
=======

  closePopup() {
    this.showErrorPopup = false;
  }
>>>>>>> merge
}
