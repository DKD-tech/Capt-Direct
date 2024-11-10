import { AuthService } from './../../services/auth/auth.service';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { response } from 'express';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  token: string | null = null;

  constructor(private router: Router, private authService: AuthService) {}

  onLogin(): void {
    //   this.authService.login(this.email, this.password).subscribe(
    //     response => {
    //       localStorage.setItem('authToken', response.token);
    //       this.router.navigate(['/dashboard-page']);
    //     },
    //     error => {
    //       console.error('Erreur de connexion', error);
    //       alert('Login failed. Please check your credentials.');
    //     }
    //   );
    // }
    this.authService.login(this.email, this.password).subscribe(
      (response) => {
        this.token = response.token;
        this.authService.setToken(this.token);
        console.log('Connexion réussie');
        this.router.navigate(['/dashboard-page']);
      },
      (error) => {
        console.error('Erreur de connexion', error);
      }
    );
  }

  onRegister() {
    this.router.navigate(['/register-page']);
  }
}
