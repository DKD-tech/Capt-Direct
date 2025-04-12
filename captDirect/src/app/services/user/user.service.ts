import { jwtDecode } from 'jwt-decode';
import { Injectable } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private authService: AuthService, private router: Router) {}

  redirectUserBasedOnRole(): void {
    const token = this.authService.getToken();
    if (token) {
      try {
        // Décodage du token JWT pour récupérer les informations de l'utilisateur
        const decodedToken: any = jwtDecode(token);
        const userRole = decodedToken.role; // Assurez-vous que le rôle est inclus dans le token

        // Redirection en fonction du rôle de l'utilisateur
        switch (userRole) {
          case 'admin':
            this.router.navigate(['/admin-dashboard']);
            break;
          case 'editor':
            this.router.navigate(['/editor-dashboard']);
            break;
          case 'viewer':
            this.router.navigate(['/viewer-dashboard']);
            break;
          default:
            this.router.navigate(['/default-dashboard']);
            break;
        }
      } catch (error) {
        console.error('Error decoding token:', error);
        this.router.navigate(['/login']); // Redirection vers la page de connexion en cas d'erreur
      }
    } else {
      this.router.navigate(['/login']); // Redirection si le token est absent
    }
  }
}
