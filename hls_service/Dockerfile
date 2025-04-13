# Base image
FROM node:18.20.4

# Installer FFmpeg et autres outils nécessaires
RUN apt-get update && apt-get install -y \
    ffmpeg \  
    && apt-get clean

# # Installer yt-dlp
# RUN pip install yt-dlp

# Créer un dossier de travail
WORKDIR /usr/src/app

# Copier les dépendances
COPY package*.json ./
RUN npm install

# Copier le code source
COPY . .

# Exposer le port pour l'API
EXPOSE 5000

# Commande de démarrage
CMD ["node", "hls_service.js"]
