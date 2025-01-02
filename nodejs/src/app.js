require("dotenv").config();

const express = require("express"); // Express instance
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");
const router = require("./routes/router");
const redisClient = require("./redis/index").client;
const SubtitleModel = require("./models/SubtitleModel"); // Modèle de sous-titres

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

const connectedUsers = {}; // Stocker les utilisateurs connectés (socket.id -> user)

// Middleware
app.use(express.json());
app.use(cors());
app.use("/api", router);

app.use((req, res, next) => {
  if (req.originalUrl.includes("%0A")) {
    console.error("Caractère %0A détecté dans l'URL");
    return res.status(400).json({ error: "Caractère non valide détecté dans l'URL" });
  }
  next();
});

// Test de la route principale
app.get("/", (req, res) => {
  res.send("Bienvenue sur le serveur de sous-titrage collaboratif");
});

// Gestion des connexions Socket.IO
io.on("connection", (socket) => {
  console.log(`Nouvelle connexion établie : ${socket.id}`);

  // Gestion des connexions utilisateurs
  socket.on("joinSession", (user) => {
    if (!user || typeof user.username !== "string" || typeof user.userId !== "string" || typeof user.videoId !== "string") {
      console.error("Données utilisateur invalides : ", user);
      return;
    }

    // Associer le socket.id à l'utilisateur connecté
    connectedUsers[socket.id] = {
      userId: user.userId,
      username: user.username,
      videoId: user.videoId,
    };
    console.log(`Utilisateur connecté : ${user.username} (ID: ${user.userId})`);

    // Joindre l'utilisateur à une salle spécifique à la vidéo
    socket.join(user.videoId);

    // Diffuser la liste des utilisateurs connectés à la session
    io.to(user.videoId).emit("updateUserList", Object.values(connectedUsers).filter((u) => u.videoId === user.videoId));
  });

  // Gestion des sous-titres en temps réel
  socket.on("editSubtitle", async (subtitle) => {
    console.log("Sous-titre reçu depuis le frontend via Socket.IO :", subtitle);

    try {
      // Étape 1 : Validation
      const { text, startTime, endTime, videoId, userId } = subtitle;

      console.log("Validation des données reçues :", { text, startTime, endTime, videoId, userId });

      if (!text || startTime == null || endTime == null || !videoId || !userId) {
        throw new Error("Données de sous-titre invalides.");
      }

      // Étape 2 : Diffusion en temps réel
      io.in(videoId).emit("updateSubtitle", subtitle);

      // Étape 3 : Stockage dans Redis
      const redisKey = `video:${videoId}:subtitles`;
      const subtitleData = { text, startTime, endTime, userId };
      await redisClient.lPush(redisKey, JSON.stringify(subtitleData));
      redisClient.expire(redisKey, 3600); // Expiration après 1 heure

      console.log(`Sous-titre traité et stocké dans Redis : ${text}`);

      // Étape 4 : Enregistrement dans la base de données
      const subtitleToSave = {
        segment_id: 2, // Assurez-vous que `videoId` correspond au segment_id
        start_time: startTime,
        end_time: endTime,
        text,
        created_by: userId,
        created_at: new Date(),
      };

      const savedSubtitle = await SubtitleModel.addSubtitle(subtitleToSave);
      console.log("Sous-titre inséré dans la base de données :", savedSubtitle);
    } catch (error) {
      console.error("Erreur lors du traitement du sous-titre :", error.message);
      socket.emit("error", { message: error.message });
    }
  });

  // Suppression d'un sous-titre
  socket.on("deleteSubtitle", async ({ segment_id, startTime }) => {
    try {
      const redisKey = `segment:${segment_id}:subtitles`;

      // Récupération et filtrage des sous-titres
      const subtitles = await redisClient.lRange(redisKey, 0, -1);
      const updatedSubtitles = subtitles.filter((subtitle) => {
        const parsed = JSON.parse(subtitle);
        return parsed.startTime !== startTime;
      });

      // Mise à jour dans Redis
      await redisClient.del(redisKey);
      updatedSubtitles.forEach((subtitle) => redisClient.lPush(redisKey, subtitle));

      // Notification aux clients
      io.in(segment_id).emit("subtitleDeleted", { startTime });
      console.log(`Sous-titre avec start_time ${startTime} supprimé.`);
    } catch (error) {
      console.error("Erreur lors de la suppression du sous-titre :", error);
      socket.emit("error", { message: "Erreur lors de la suppression du sous-titre." });
    }
  });

  // Déconnexion utilisateur
  socket.on("disconnect", () => {
    console.log(`Socket déconnectée : ${socket.id}`);

    // Supprimer l'utilisateur déconnecté
    const disconnectedUser = connectedUsers[socket.id];
    if (disconnectedUser) {
      console.log(`Utilisateur déconnecté : ${disconnectedUser.username}`);
      delete connectedUsers[socket.id];

      // Diffuser la liste mise à jour
      io.to(disconnectedUser.videoId).emit("updateUserList", Object.values(connectedUsers).filter((u) => u.videoId === disconnectedUser.videoId));
    }
  });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur http://localhost:${PORT}`);
});

module.exports = { connectedUsers };
