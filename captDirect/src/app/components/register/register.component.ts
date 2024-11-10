import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  username: string = '';
  email: string = '';
  password: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  onRegister() {
    const data = {
      email: this.email,
      password: this.password,
      username: this.username,
    };
    this.authService.signup(data).subscribe(
      () => {
        this.router.navigate(['/dashboard-page']); // Redirection après enregistrement
      },
      (error: any) => {
        console.error("Erreurr lors de l'enregistrement", error);
        alert('Registration failed. Please try again.');
      }
    );
  }
  onLogin() {
    this.router.navigate(['/login-page']);
  }
}
