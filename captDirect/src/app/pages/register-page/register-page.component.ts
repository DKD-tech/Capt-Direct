import { Component } from '@angular/core';
import { HeaderComponent } from '../../components/header/header.component';
import { Router } from '@angular/router';
import { RegisterComponent } from '../../components/register/register.component';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'app-register-page',
  standalone: true,
<<<<<<< HEAD
  imports: [HeaderComponent, RegisterComponent, FooterComponent],
=======
  imports: [RegisterComponent],
>>>>>>> merge
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss',
})
export class RegisterPageComponent {
  constructor(private router: Router) {}
}
