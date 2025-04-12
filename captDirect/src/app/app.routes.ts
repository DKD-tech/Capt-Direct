import { Routes } from '@angular/router';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { RegisterPageComponent } from './pages/register-page/register-page.component';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { authGuard } from './services/auth/auth.guard';
// import { StreamingPlayerComponent } from './components/streaming-player/streaming-player.component';
import { StreamingPageComponent } from './pages/streaming-page/streaming-page.component';
import { StreamingPlayerPageComponent } from './pages/streaming-player-page/streaming-player-page.component';

export const routes: Routes = [
  {
    path: 'streaming/:sessionId', // 📺 Liste des vidéos sous-titrées
    component: StreamingPageComponent,
  },
  {
    path: 'streaming-player', // 🎥 Lecteur vidéo
    component: StreamingPlayerPageComponent,
  },
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
    canActivate: [authGuard],
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
