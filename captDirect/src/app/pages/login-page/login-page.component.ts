import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LoginComponent } from '../../components/login/login.component';
import { HeaderComponent } from '../../components/header/header.component';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [LoginComponent, HeaderComponent, FooterComponent],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  constructor(private router: Router) {}
}
