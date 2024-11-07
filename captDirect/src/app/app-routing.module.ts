import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { routes } from './app.routes';  // Importez vos routes ici

@NgModule({
  imports: [RouterModule.forRoot(routes)],  // Utilisez RouterModule pour configurer les routes
  exports: [RouterModule]  // Exporte le module pour qu'il soit utilisé ailleurs
})
export class AppRoutingModule { }
