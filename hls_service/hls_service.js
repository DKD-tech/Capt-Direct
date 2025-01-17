const express = require("express");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();
app.use(express.json());

// Dossier pour les vidéos et les segments HLS
const VIDEOS_DIR = path.join(__dirname, "videos");
const HLS_OUTPUT_DIR = path.join(__dirname, "hls_output");

if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR);
if (!fs.existsSync(HLS_OUTPUT_DIR)) fs.mkdirSync(HLS_OUTPUT_DIR);

// Fonction pour télécharger une vidéo depuis une URL
async function downloadVideo(videoUrl, outputFilePath) {
  return new Promise((resolve, reject) => {
    const ytDlpCommand = `yt-dlp -o "${outputFilePath}" ${videoUrl}`;
    exec(ytDlpCommand, (error, stdout, stderr) => {
      if (error) {
        console.error("Erreur téléchargement yt-dlp :", stderr);
        return reject(error);
      }
      resolve();
    });
  });
}

// Fonction pour générer des segments HLS
async function generateHlsSegment(videoPath, segment, sessionDir) {
  const { start_time, end_time, segment_id } = segment;
  const outputFile = path.join(sessionDir, `playlist-${segment_id}.m3u8`);
  const ffmpegCommand = `ffmpeg -i "${videoPath}" -ss ${start_time} -to ${end_time} \
    -c:v libx264 -preset ultrafast -crf 23 -c:a aac -f hls -hls_time 4 \
    -hls_playlist_type vod -hls_segment_filename "${sessionDir}/segment-${segment_id}-%03d.ts" "${outputFile}"`;

  return new Promise((resolve, reject) => {
    exec(ffmpegCommand, (error, stdout, stderr) => {
      if (error) {
        console.error("Erreur FFmpeg :", stderr);
        return reject(error);
      }
      resolve();
    });
  });
}

app.post("/stream-hls", async (req, res) => {
  const { session_id, video_url, segments } = req.body;

  if (!session_id || !video_url || !segments) {
    return res.status(400).json({ message: "Champs obligatoires manquants." });
  }

  try {
    // Préparer le dossier pour cette session
    const sessionDir = path.join(HLS_OUTPUT_DIR, `session-${session_id}`);
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir);

    // Préparer le chemin de la vidéo
    const localVideoPath = path.join(VIDEOS_DIR, path.basename(video_url));

    // Vérifier si la vidéo doit être téléchargée
    if (!fs.existsSync(localVideoPath) && video_url.startsWith("http")) {
      console.log(`Téléchargement de la vidéo depuis : ${video_url}`);
      await downloadVideo(video_url, localVideoPath);
    }

    // Générer les segments HLS
    for (const segment of segments) {
      await generateHlsSegment(localVideoPath, segment, sessionDir);
    }

    res
      .status(200)
      .json({
        message: "Streaming et segments HLS prêts.",
        outputDir: sessionDir,
      });
  } catch (error) {
    console.error("Erreur dans le service :", error.message);
    res
      .status(500)
      .json({ message: "Erreur serveur.", details: error.message });
  }
});

// Démarrer le service
const PORT = 5000;
app.listen(PORT, () =>
  console.log(`Service Stream + HLS en cours d'exécution sur le port ${PORT}`)
);
