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
    jq \
    curl \
    && apt-get clean



# Télécharger et compiler nginx avec le module RTMP
RUN wget http://nginx.org/download/nginx-1.23.1.tar.gz && \
    tar -zxvf nginx-1.23.1.tar.gz && \
    git clone https://github.com/arut/nginx-rtmp-module.git && \
    cd nginx-1.23.1 && \
    ./configure --add-module=../nginx-rtmp-module --with-http_ssl_module && \
    make && make install


# Nettoyer les fichiers temporaires
RUN apt-get remove -y build-essential && apt-get autoremove -y && \
    rm -rf /nginx-1.23.1 /nginx-rtmp-module /nginx-1.23.1.tar.gz

# Installer les dépendances pour l'image finale
RUN apt-get update && apt-get install -y \
    python3 python3-pip ffmpeg jq curl procps \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# # Installer yt-dlp via pip
RUN pip3 install yt-dlp
# Copier la configuration nginx
COPY nginx.conf /usr/local/nginx/conf/nginx.conf

# Copier le script dans le conteneur
COPY stream_with_autorefresh.sh /usr/local/bin/stream_with_autorefresh.sh
RUN chmod +x /usr/local/bin/stream_with_autorefresh.sh

# Ajouter le script d'automatisation au démarrage
RUN echo '#!/bin/bash\n/usr/local/bin/stream_with_autorefresh.sh &\n/usr/local/nginx/sbin/nginx -g "daemon off;"' > /usr/local/bin/start.sh && \
    chmod +x /usr/local/bin/start.sh

RUN apt-get update && apt-get install -y procps

# Créer le dossier HLS si nécessaire
RUN mkdir -p /opt/data/hls && \
    chown -R nobody:nogroup /opt/data/hls


# Exposer les ports nécessaires
EXPOSE 80 1935

# Commande de démarrage
CMD ["/usr/local/bin/start.sh"]
