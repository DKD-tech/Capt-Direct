# Utiliser une image officielle de Node.js
FROM node:18.20.4

# Installer ffmpeg (et donc ffprobe)
RUN apt-get update && apt-get install -y ffmpeg

# Définir le répertoire de travail
WORKDIR /

# Copier les fichiers package.json et package-lock.json dans l'image
COPY package.json package-lock.json ./

# Installer les dépendances
RUN npm install && npm install bcryptjs --build-from-source

# Copier tout le code source
COPY . .

# Exposer le port du backend
EXPOSE 3000

# Démarrer l'application backend
CMD ["node", "src/app.js"]
