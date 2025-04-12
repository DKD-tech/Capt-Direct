# Base image
FROM debian:bullseye

# Installer les dépendances nécessaires
RUN apt-get update && apt-get install -y \
    git \
    wget \
    build-essential \
    libpcre3-dev \
    zlib1g-dev \
    libssl-dev \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    net-tools \
    && apt-get clean

# Télécharger et compiler nginx avec le module RTMP
RUN wget http://nginx.org/download/nginx-1.23.1.tar.gz && \
    tar -zxvf nginx-1.23.1.tar.gz && \
    git clone https://github.com/arut/nginx-rtmp-module.git && \
    cd nginx-1.23.1 && \
    ./configure --add-module=../nginx-rtmp-module --with-http_ssl_module && \
    make && make install
# Installer bash
RUN apt-get update && apt-get install -y bash

# Nettoyer les fichiers temporaires
RUN apt-get remove -y build-essential && apt-get autoremove -y && \
    rm -rf /nginx-1.23.1 /nginx-rtmp-module /nginx-1.23.1.tar.gz

# Copier la configuration nginx
COPY nginx-rtmp-ffmpeg/nginx.conf /usr/local/nginx/conf/nginx.conf

# Copier la page HTML dans le répertoire des fichiers statiques nginx
COPY nginx-rtmp-ffmpeg/index.html /usr/local/nginx/html/index2.html

# Copier le script et les fichiers nécessaires dans le conteneur
COPY nginx-rtmp-ffmpeg/stream_with_autorefresh.sh /usr/local/bin/stream_with_autorefresh.sh
RUN chmod +x /usr/local/bin/stream_with_autorefresh.sh

# Ajouter le script d'automatisation au démarrage avec libération des ports et démarrage de Redis
RUN bash -c 'echo -e "#!/bin/bash\n\n# Libérer les ports si déjà utilisés\necho \"Vérification des ports...\"\nif netstat -tuln | grep -q \":80\" || netstat -tuln | grep -q \":1935\"; then\n    echo \"Les ports 80 ou 1935 sont déjà utilisés. Libération...\"\n    fuser -k 80/tcp 1935/tcp\n    if [ \$? -ne 0 ]; then\n        echo \"Échec de la libération des ports.\"\n        exit 1\n    fi\nelse\n    echo \"Les ports 80 et 1935 sont libres.\"\nfi\n\n# Démarrer Redis\necho \"Démarrage de Redis...\"\nservice redis-server start\n\n\necho \"Lancement du script de streaming...\"\n/usr/local/bin/stream_with_autorefresh.sh &\nSTREAM_PID=\$!\n\n\necho \"Lancement de NGINX...\"\n/usr/local/nginx/sbin/nginx -g \"daemon off;\"\n\n\necho \"Attente du processus de streaming...\"\nwait \$STREAM_PID" > /usr/local/bin/start.sh' && \
    chmod +x /usr/local/bin/start.sh


RUN apt-get update && apt-get install -y procps

# Installer Redis et les dépendances nécessaires
RUN apt-get update && \
    apt-get install -y redis-server && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Créer le dossier ou sera stocker la video si nécessaire
RUN mkdir -p /usr/src/app/videos && \
    chown -R nobody:nogroup /usr/src/app/videos

# Copier la video dans le contenneur nginx
COPY nginx-rtmp-ffmpeg/videos/nr.mp4 /usr/src/app/videos/

COPY nginx-rtmp-ffmpeg/stream_with_autorefresh.sh /usr/local/bin/stream_with_autorefresh.sh

# Créer le dossier HLS si nécessaire
RUN mkdir -p /opt/data/hls && \
    chown -R nobody:nogroup /opt/data/hls

#RUN apt-get update && apt-get install -y lsof

# Exposer les ports pour NGINX et Redis
EXPOSE 80 1935 6379

# Commande de démarrage
ENTRYPOINT ["/bin/bash", "/usr/local/bin/start.sh"]
