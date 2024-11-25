# Dockerfile pour Frontend
FROM node:18 

# Installer Angular CLI globalement
RUN npm install -g @angular/cli

WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json ./

RUN npm install

# Copier tout le code source
COPY . .


# Copier les fichiers construits dans le répertoire Nginx
# COPY --from=builder /src/app/dist/captDirect /usr/share/nginx/html


EXPOSE 4200

# Commande par défaut pour démarrer Nginx
CMD ["npm", "start"]
