#!/bin/bash

RTMP_URL="rtmp://localhost/live/stream"

# Fonction pour récupérer les sessions actives depuis PostgreSQL
# fetch_sessions() {
#   psql -U postgres -d stc_db -t -c "SELECT session_id, video_url FROM sessions WHERE status = 'active';"
# }
fetch_sessions() {
  # Remplacez 'backend' par le nom du conteneur backend dans docker-compose.yml
  curl -s http://backend:3000/api/sessions/generate-hls
}
while true; do
  echo "Récupération des sessions actives depuis le backend..."
  
  # Appeler l'API et lire les sessions actives
  sessions=$(fetch_sessions)

  if [ -z "$sessions" ] || [ "$sessions" == "[]" ]; then
    echo "Aucune session active trouvée. Réessai dans 60 secondes..."
    sleep 60
    continue
  fi

  # Parcourir les sessions (suppose que l'API renvoie un tableau JSON)
  echo "$sessions" | jq -c '.[]' | while read -r session; do
    # Extraire session_id et video_url
    session_id=$(echo "$session" | jq -r '.session_id')
    video_url=$(echo "$session" | jq -r '.video_url')

    if [ -n "$session_id" ] && [ -n "$video_url" ]; then
      echo "Streaming de la session $session_id avec la vidéo $video_url"
      
      # Lancer FFmpeg en arrière-plan
      ffmpeg -re -i "$video_url" \
        -c:v libx264 -preset veryfast -tune zerolatency -b:v 1500k \
        -c:a aac -b:a 128k -ar 44100 -ac 2 \
        -f flv "$RTMP_URL/session_$session_id" &
      
      # Pause pour éviter de surcharger les ressources
      sleep 5
    else
      echo "Session invalide détectée : $session"
    fi
  done

  echo "Cycle de streaming terminé. Réessai dans 60 secondes..."
  sleep 60
done
