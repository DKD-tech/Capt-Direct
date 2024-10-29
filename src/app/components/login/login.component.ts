import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  constructor(private router: Router) {}

  onLogin() {
    console.log('Connexion effectuée');
    this.router.navigate(['/dashboard-page']);
  }

  onRegister() {
    this.router.navigate(['/register-page']);
  }
}
