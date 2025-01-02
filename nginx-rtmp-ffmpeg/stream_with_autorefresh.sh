# #!/bin/bash

# # Chemin vers la vidéo locale
# # LOCAL_VIDEO_PATH="/usr/src/app/videos/nr.mp4"
# # Arguments
# SESSION_ID=$1
# VIDEO_PATH=$2
# RTMP_URL="rtmp://localhost/live/stream"

# # Vérifier si le fichier vidéo existe
# # Vérifier les arguments
# if [ -z "$SESSION_ID" ] || [ -z "$VIDEO_PATH" ]; then
#     echo "Usage: $0 <SESSION_ID> <VIDEO_PATH>"
#     exit 1
# fi

# # Vérifier si le fichier vidéo existe
# if [ ! -f "$VIDEO_PATH" ]; then
#     echo "Le fichier vidéo n'existe pas : $VIDEO_PATH"
#     exit 1
# fi

# echo "Diffusion de la vidéo locale : $VIDEO_PATH pour la session $SESSION_ID"

# # Lancer FFmpeg avec la vidéo locale
# ffmpeg -re -i "$VIDEO_PATH" \
#     -c:v libx264 -preset veryfast -tune zerolatency -b:v 1500k \
#     -c:a aac -b:a 128k -ar 44100 -ac 2 \
#     -f flv "$RTMP_URL"

# echo "Le streaming pour la session $SESSION_ID s'est arrêté."

#!/bin/bash

SESSION_ID=$1
VIDEO_PATH=$2

# Vérifiez les paramètres
if [ -z "$SESSION_ID" ] || [ -z "$VIDEO_PATH" ]; then
  echo "Usage: $0 <session_id> <video_path>"
  exit 1
fi

# Chemin pour les segments HLS
HLS_DIR="/opt/data/hls/session-$SESSION_ID"
mkdir -p $HLS_DIR

# Supprimez les anciens fichiers s’ils existent
rm -rf $HLS_DIR/*

# Générer les segments avec FFmpeg
ffmpeg -i "$VIDEO_PATH" -codec: copy -start_number 0 -hls_time 10 -hls_list_size 0 -f hls "$HLS_DIR/playlist.m3u8"
echo "Streaming HLS démarré pour session $SESSION_ID."
