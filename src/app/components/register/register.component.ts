import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
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
}
