# Dockerfile pour Frontend
FROM node:18-alpine 

# Définir le répertoire de travail
WORKDIR /captDirect

# Copier uniquement les fichiers de dépendances en premier pour tirer parti du cache Docker
COPY package.json package-lock.json ./

# Installer les dépendances du projet
RUN npm install

# Installer Angular CLI globalement si nécessaire
RUN npm install -g @angular/cli

# Copier tout le code source dans le conteneur
COPY . .

# Exposer le port pour le serveur Angular
EXPOSE 4200

# Commande par défaut pour démarrer Angular en mode développement
CMD ["ng", "serve", "--host", "0.0.0.0", "--port", "4200"]
