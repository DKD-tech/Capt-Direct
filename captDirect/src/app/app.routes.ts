import { Routes } from '@angular/router';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { RegisterPageComponent } from './pages/register-page/register-page.component';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login-page',
    pathMatch: 'full',
  },
  {
    path: 'login-page',
    component: LoginPageComponent,
  },
  {
    path: 'register-page',
    component: RegisterPageComponent,
  },
  {
    path: 'dashboard-page',
    children: [
      {
        path: '',
        component: DashboardPageComponent,
      },
      {
        path: ':id',
        component: DashboardPageComponent,
      },
    ],
  },
  {
    path: '**',
    component: NotFoundComponent,
  },
];
