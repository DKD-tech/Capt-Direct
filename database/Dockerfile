# Utilisez l'image officielle de PostgreSQL
FROM postgres:latest

# Variables d'environnement pour PostgreSQL
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=Kh@didia74
ENV POSTGRES_DB=stc_db

# Copier le fichier .sql dans le conteneur
COPY export.sql /docker-entrypoint-initdb.d/

# Les fichiers .sql dans le dossier /docker-entrypoint-initdb.d/
# seront automatiquement exécutés lors de la création du conteneur
