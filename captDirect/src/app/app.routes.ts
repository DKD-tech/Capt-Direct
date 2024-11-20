import { Routes } from '@angular/router';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { RegisterPageComponent } from './pages/register-page/register-page.component';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { HomeComponent } from './components/home/home.component';
import { SideBarComponent } from './components/side-bar/side-bar.component';
import { VideosListComponent } from './videos-list/videos-list.component';


export const routes: Routes = [
  {
    path: 'side-bar',
    component: SideBarComponent,
  },
  {
    path: 'login-page',
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
  },{
    path: '',
    component: HomeComponent,
  },{
    path: 'videos-list',
    component: VideosListComponent,
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
