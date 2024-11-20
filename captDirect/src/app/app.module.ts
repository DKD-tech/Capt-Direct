import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';  // Composant principal de l'application
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { AppRoutingModule } from './app-routing.module'; 
import { CommonModule } from '@angular/common';


@NgModule({
  declarations: [
    AppComponent,       // Déclarez le composant principal de l'application
    HeaderComponent,    // Déclarez le Header
    FooterComponent     // Déclarez le Footer
  ],
  imports: [
    BrowserModule,      // Assurez-vous d'importer le BrowserModule
    AppRoutingModule,    // Ajoutez ici votre module de routage si nécessaire
    CommonModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [],
  bootstrap: [AppComponent]  // Le composant principal qui s'affichera au lancement de l'application
})
export class AppModule { }
