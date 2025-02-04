#  M2-Projet 

**Capt-Direct**  est une application de sous-titrage collaboratif 

##  Fonctionnalités principales  

**Connexion** : Se connecter sur l'application après avoir crée un compte. 

**gestion des sessions** : Rejoindre une session existante ou créer la vôtre facilement.

**Gestion des segments collaborateurs** : Attribution automatique des segments pour éviter les conflits. 

**Sous-titrage** : Ajouter des sous-titres à votre segment pendant le visionnage. 

**Mode collaboratif** : Plusieurs utilisateurs peuvent sous-titrer en même temps.   

**Correction des chevauchements** : Ajustement automatique pour éviter les répétitions entre segments.  

**Exportation en format SRT** : Téléchargez les sous-titres générés en fichier `.srt` pour une utilisation ultérieure.  


### Pré-requis

## Option 1 : Utilisation avec Docker  

Si tu veux éviter d’installer manuellement toutes les dépendances, **Docker** est la solution la plus simple. Assure-toi d’avoir :  
- **Docker** installé : [Télécharger Docker](https://www.docker.com/get-started)  
- **Docker Compose** (fourni avec Docker Desktop)  

   **Passe directement à la section "Démarrage avec Docker"** ⬇️  

## Option 2 : Utilisation manuelle  

Si tu veux exécuter le projet sans Docker, voici ce qu'il faut installer :  

- **Node.js** (v16 ou supérieur) : [Télécharger ici](https://nodejs.org/)  
- **NPM** (fourni avec Node.js) ou **Yarn** (alternative à NPM)  
- **PostgreSQL** (base de données) : [Installer PostgreSQL](https://www.postgresql.org/download/)  
- **Angular CLI** (pour le frontend) :  
  ```sh
  npm install -g @angular/cli

_Facultatif mais recommandé_ :  
**Redis** (pour le cache) 

### Installation manuelle

## **Cloner le projet**  
git clone https://github.com/utilisateur/nom-du-projet.git
cd nom-du-projet 

_Accéder aux dossiers_:

Frontend : cd captdirect, executer ```  npm install -g @angular/cli ```

Backend : cd nodejs puis executer   ``` npm install ```

## Démarrage


# Démarrage sans Docker 

**Démarrer le backend**  
```sh
npm run dev
```

L'API Backend sera disponible ici : http://localhost:3000/api/status

**Démarrer le frontend**
```sh
ng serve
```

L'interface Web sera accessible ici : http://localhost:4200

# Démarrage avec Docker

**Lancer l'application avec Docker Compose**
```sh
sudo docker-compose up -d --build
```

**pour la verification** 
```sh
docker ps
```
Accéder directement à l'interface web et à l'API backend 

  Frontend : http://localhost:4200
  API Backend : http://localhost:3000/api/status

**Remarque :**
Si tu veux arrêter l'application avec Docker, utilise cette commande : 
```sh 
docker-compose down 
```


