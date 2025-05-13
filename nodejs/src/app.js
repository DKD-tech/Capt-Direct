require("dotenv").config();

const express = require("express"); // Express instance
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");
const router = require("./routes/router");

// Importation des contrôleurs
const signupController = require("./controllers/auth/signUpController");
const loginController = require("./controllers/auth/loginController");
const authMiddleware = require("./middlewares/authMiddleware");
const logoutController = require("./controllers/user/logoutController");
const { getSessionStartTime } = require("./controllers/rtmp/streamController");
const {
  assignUserToSegmentController,
} = require("./controllers/stc/segmentUsersController");
const {
  assignDynamicSegment,
} = require("./controllers/stc/assignSegmentController");
const { setAsync } = require("./redis/index");
const { startSegmentScheduler } = require("./helpers/segmentScheduler");
const socketUsers = new Map();
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

app.use(express.json());
app.use(cors());
app.use("/api", router);
app.set("io", io); // ✅ Attache io à app pour qu’il soit accessible dans les contrôleurs

// Stockage des sous-titres, utilisateurs et sessions
const subtitles = {};
const users = {};

const videos = {};

// Test de la route principale
app.get("/", (req, res) => {
  res.send("Bienvenue sur le serveur de sous-titrage collaboratif");
});

// Routes d'authentification
app.post("/api/auth/signup", signupController);
app.post("/api/auth/login", loginController);
app.post("/api/user/logout", logoutController);

// Route protégée exemple
app.get("/api/protected-route", authMiddleware, (req, res) => {
  res.json({ message: "Bienvenue sur la route protégée !" });
});

// /**
//  * Utilisateur actives
//  */
// const updateActiveUsers = () => {
//   const activeUsers = Array.from(io.sockets.sockets.keys());
//   io.emit("activeUsers", activeUsers);
// };

io.on("connection", (socket) => {
  // let previousId;

  // Rejoindre une session
  // socket.on("join-session", ({ session_id, user_id, userName }) => {
  //   console.log(`Requête pour rejoindre la session :`, {
  //     session_id,
  //     user_id,
  //     userName,
  //   });

  //   if (!session_id || !user_id) {
  //     socket.emit("error", { message: "Session ID et User ID requis" });
  //     return;
  //   }

  //   // Ajoutez l'utilisateur à l'objet `users`
  //   users[user_id] = {
  //     user_id,
  //     userName: userName.trim(), // Nettoyez les espaces
  //     session_id,
  //     socket_id: socket.id,
  //   };

  //   // Ajoutez l'utilisateur à la salle Socket.IO
  //   socket.join(`session:${session_id}`);

  //   console.log(`Utilisateur ${user_id} a rejoint la session ${session_id}`);
  //   socket.emit("joinedSession", { session_id, user_id, userName });

  //   // Informez les autres utilisateurs de la session
  //   io.to(`session:${session_id}`).emit("userJoined", {
  //     userId: user_id,
  //     userName: userName.trim(),
  //   });
  // });

  // Rejoindre une session spécifique
  // socket.on("join-session", async ({ session_id, username, user_id }) => {
  //   if (!session_id || !username || !user_id) {
  //     console.error("session_id, user_id ou username manquant !");
  //     return;
  //   }

  //   try {
  //     socket.data.user_id = user_id;
  //     socket.data.username = username;
  //     socket.data.session_id = session_id;
  //     // Ajouter le socket à la room correspondant à la session
  //     socket.join(`session:${session_id}`);
  //     console.log(`${username} a rejoint la session ${session_id}`);

  //     //  Stocker user_id → socket.id dans Redis
  //     await setAsync(`socket:${user_id}`, socket.id);
  //     console.log(` Redis : user_id ${user_id} → socket.id ${socket.id}`);

  //     // Liste des utilisateurs connectés à la session
  //     const clientsInRoom = await io.in(`session:${session_id}`).allSockets();
  //     console.log(
  //       `Clients trouvés dans room session:${session_id}`,
  //       clientsInRoom
  //     );
  //     const users = [...clientsInRoom].map((socketId) => {
  //       const clientSocket = io.sockets.sockets.get(socketId);
  //       return clientSocket?.data.username || "Utilisateur inconnu";
  //     });

  //     console.log(`Utilisateurs dans la session ${session_id} :`, users);

  //     // Notifier tous les utilisateurs de la session
  //     io.to(`session:${session_id}`).emit("update-users", users);
  //   } catch (err) {
  //     console.error("Erreur lors de la récupération des utilisateurs :", err);
  //   }
  // });
  console.log("🔌 Nouveau client connecté :", socket.id);

  socket.onAny((event, ...args) => {
    console.log(`📨 Reçu [${event}] avec :`, args);
  });
  // socket.on("join-session", async ({ session_id, username, user_id }) => {
  //   console.log("[join-session] Reçu avec :", {
  //     session_id,
  //     username,
  //     user_id,
  //   });
  //   if (!session_id || !username || !user_id) {
  //     console.error("session_id, user_id ou username manquant !");
  //     socket.emit("join-error", "Informations incomplètes");
  //     return;
  //   }

  //   try {
  //     socket.data.user_id = user_id;
  //     socket.data.username = username;
  //     socket.data.session_id = session_id;

  //     socket.join(`session:${session_id}`);
  //     console.log(`${username} a rejoint la session ${session_id}`);
  //     console.log("Stocké dans socket.data :", socket.data);

  //     await setAsync(`socket:${user_id}`, socket.id);
  //     console.log(` Redis : user_id ${user_id} → socket.id ${socket.id}`);

  //     // Confirmation au client que la jointure a réussi
  //     socket.emit("session-joined", { success: true });

  //     // Met à jour la liste des utilisateurs
  //     const clientsInRoom = await io.in(`session:${session_id}`).allSockets();
  //     console.log(`Clients dans session:${session_id} =>`, clientsInRoom);

  //     const users = [...clientsInRoom].map((socketId) => {
  //       const clientSocket = io.sockets.sockets.get(socketId);
  //       console.log(`Socket ${socketId} →`, clientSocket?.data);
  //       return clientSocket?.data.username || "Utilisateur inconnu";
  //     });

  //     console.log(`Utilisateurs dans la session ${session_id} :`, users);
  //     io.to(`session:${session_id}`).emit("update-users", users);
  //   } catch (err) {
  //     console.error("Erreur join-session :", err);
  //     socket.emit("join-error", "Erreur serveur");
  //   }
  // });

  // Quitter une session vidéo

  // socket.on("leaveVideoSession", ({ userId, sessionId }) => {
  //   console.log("Requête pour quitter la session vidéo :", { userId, sessionId });

  //   // Vérifiez si l'utilisateur existe
  //   if (!users[userId]) {
  //     console.error(
  //       `Utilisateur avec ID ${userId} introuvable dans l'objet users.`
  //     );
  //     return socket.emit("error", {
  //       message: `Utilisateur ${userId} introuvable.`,
  //     });
  //   }

  //   // Retirez l'utilisateur de la session
  //   socket.leave(videoId);
  //   io.in(videoId).emit("userLeft", {
  //     userId,
  //     userName: users[userId].userName,
  //   });

  //   // Optionnel : Supprimez l'utilisateur de la liste locale si nécessaire
  //   delete users[userId];
  //   console.log(`Utilisateur ${userId} a quitté la session vidéo ${videoId}.`);
  // });
  socket.on("join-session", ({ session_id, username, user_id }) => {
    console.log("[join-session] Reçu avec :", {
      session_id,
      username,
      user_id,
    });

    if (!session_id || !username || !user_id) {
      console.error("❌ session_id, user_id ou username manquant !");
      socket.emit("join-error", "Informations incomplètes");
      return;
    }

    socket.data.user_id = user_id;
    socket.data.username = username.trim();
    socket.data.session_id = session_id;

    // 🧠 Stocke dans la map
    socketUsers.set(user_id, socket.id);

    socket.join(`session:${session_id}`);
    console.log(`${username} a rejoint la session ${session_id}`);

    // ⚡ Mettre à jour la liste des utilisateurs connectés
    const sockets = Array.from(
      io.sockets.adapter.rooms.get(`session:${session_id}`) || []
    );
    const connectedUsers = sockets.map(
      (id) => io.sockets.sockets.get(id)?.data.username || "Utilisateur inconnu"
    );

    io.to(`session:${session_id}`).emit("update-users", connectedUsers);
  });
  // Quitter une session vidéo
  // socket.on("leaveVideoSession", ({ userId, sessionId }) => {
  //   console.log("Requête pour quitter la session :", { userId, sessionId });

  //   const roomName = `session:${sessionId}`;

  //   // Retirer le socket de la room
  //   socket.leave(roomName);

  //   // Émettre un événement aux autres membres de la session
  //   io.to(roomName).emit("userLeft", {
  //     userId,
  //     userName: socket.data.username || `User ${userId}`,
  //   });

  //   console.log(`Utilisateur ${userId} a quitté la session ${sessionId}.`);

  //   // Supprimer la socket de Redis si nécessaire
  //   const { delAsync } = require("./redis/index");
  //   delAsync(`socket:${userId}`).then((result) => {
  //     console.log(
  //       `Clé Redis supprimée pour user ${userId} → Résultat: ${result}`
  //     );
  //   });

  //   // Mettre à jour la liste des utilisateurs dans la session
  //   io.in(roomName)
  //     .fetchSockets()
  //     .then((sockets) => {
  //       const usernames = sockets.map(
  //         (s) => s.data.username || "Utilisateur inconnu"
  //       );
  //       console.log(
  //         `Utilisateurs restants dans la session ${sessionId} :`,
  //         usernames
  //       ); // <== AJOUT
  //       io.to(roomName).emit("update-users", usernames);
  //     })
  //     .catch((err) => {
  //       console.error("Erreur lors de la mise à jour des utilisateurs :", err);
  //     });
  // });
  socket.on("disconnect", () => {
    const { user_id, session_id } = socket.data || {};
    if (!user_id || !session_id) {
      console.warn(`Socket ${socket.id} déconnecté sans données utilisateur`);
      return;
    }

    console.log(
      `🛑 Déconnexion de l'utilisateur ${user_id} (socket ${socket.id})`
    );
    socketUsers.delete(user_id);
    socket.leave(`session:${session_id}`);

    const sockets = Array.from(
      io.sockets.adapter.rooms.get(`session:${session_id}`) || []
    );
    const connectedUsers = sockets.map(
      (id) => io.sockets.sockets.get(id)?.data.username || "Utilisateur inconnu"
    );

    io.to(`session:${session_id}`).emit("update-users", connectedUsers);
  });

  // ❌ Déconnexion manuelle (ex: bouton logout)
  socket.on("leaveVideoSession", ({ userId, sessionId }) => {
    console.log(`💨 Reçu leaveVideoSession :`, { userId, sessionId });

    socketUsers.delete(userId);
    socket.leave(`session:${sessionId}`);

    const sockets = Array.from(
      io.sockets.adapter.rooms.get(`session:${sessionId}`) || []
    );
    const connectedUsers = sockets.map(
      (id) => io.sockets.sockets.get(id)?.data.username || "Utilisateur inconnu"
    );

    io.to(`session:${sessionId}`).emit("update-users", connectedUsers);
  });

  // Suppression des sous-titres
  socket.on("deleteSubtitle", async ({ segment_id, start_time }) => {
    const redisKey = `segment:${segment_id}:subtitles`;

    // Récupérer et filtrer les sous-titres
    const subtitles = await redisClient.lRange(redisKey, 0, -1);
    const updatedSubtitles = subtitles.filter((subtitle) => {
      const parsed = JSON.parse(subtitle);
      return parsed.start_time !== start_time;
    });

    // Remettre à jour Redis
    await redisClient.del(redisKey);
    updatedSubtitles.forEach((subtitle) =>
      redisClient.lPush(redisKey, subtitle)
    );

    io.in(segment_id).emit("subtitleDeleted", { start_time });
  });

  // Gestion de la synchronisation vidéo
  socket.on("playVideo", ({ videoId, currentTime }) => {
    io.in(videoId).emit("playVideo", { currentTime });
  });

  socket.on("pauseVideo", ({ videoId, currentTime }) => {
    io.in(videoId).emit("pauseVideo", { currentTime });
  });

  socket.on("seekVideo", ({ videoId, newTime }) => {
    io.in(videoId).emit("seekVideo", { newTime });
  });

  // Notifications et états d'utilisateur
  socket.on("userTyping", ({ userId, videoId }) => {
    io.in(videoId).emit("userTyping", { userId });
  });

  socket.on("notification", ({ type, message, userId }) => {
    io.emit("notification", { type, message, userId });
  });

  // Événement : éditer les sous-titres en direct
  socket.on("editSubtitle", (subtitle) => {
    console.log("Sous-titre reçu côté serveur :", subtitle);
    // Diffuse le sous-titre à tous les utilisateurs dans la salle actuelle
    io.emit("updateSubtitle", subtitle);
    // io.in(subtitle.videoId).emit("updateSubtitle", subtitle);
  });

  socket.on("addSubtitle", async (subtitle) => {
    const { segment_id, text, start_time, end_time, created_by } = subtitle;

    // Clé unique pour Redis
    const redisKey = `segment:${segment_id}:subtitles`;
    const subtitleData = { text, start_time, end_time, created_by };

    // Stocker dans Redis
    await redisClient.lPush(redisKey, JSON.stringify(subtitleData));
    redisClient.expire(redisKey, 3600); // Expire après 1 heure (modifiable)

    // Diffuser en temps réel à tous les utilisateurs
    io.in(segment_id).emit("newSubtitle", subtitleData);

    console.log(`Sous-titre ajouté au cache Redis : ${text}`);
  });

  // Déconnexion de l'utilisateur

  // socket.on("disconnect", () => {
  //   const { user_id, session_id } = socket.data || {};
  //   if (user_id && session_id) {
  //     console.log(
  //       `Utilisateur ${user_id} déconnecté de la session ${session_id}`
  //     );
  //   } else {
  //     console.log(`Socket déconnecté sans données utilisateur : ${socket.id}`);
  //   }
  // });
  socket.on("disconnect", async () => {
    const { user_id, session_id } = socket.data || {};

    if (user_id && session_id) {
      console.log(
        `Utilisateur ${user_id} déconnecté de la session ${session_id}`
      );
      const { delAsync } = require("./redis/index"); // ou "../redis/index" selon ta structure
      const result = await delAsync(`socket:${user_id}`);
      console.log(
        ` Clé Redis supprimée pour user ${user_id} → Résultat: ${result}`
      );

      // Étape 1 : Supprimer les assignations des segments de cet utilisateur
      // const {
      //   handleUserDisconnection,
      // } = require("./controllers/stc/assignSegmentController");
      const { getConnectedUsers } = require("./utils/socketUtils");

      // const userSegments = await handleUserDisconnection({
      //   user_id,
      //   session_id,
      // });

      // Étape 2 : Récupérer la liste mise à jour des utilisateurs connectés
      const connectedUsers = await getConnectedUsers(io, session_id);

      // Étape 3 : Émettre des événements pour informer les autres utilisateurs
      io.to(`session:${session_id}`).emit("update-users", connectedUsers);
      // io.to(`session:${session_id}`).emit("segments-redistributed", {
      //   updatedSegments: userSegments,
      // });
    } else {
      console.log(`Socket déconnecté sans données utilisateur : ${socket.id}`);
    }
  });
});

// Envoie `elapsedTime` chaque seconde à chaque session active
setInterval(async () => {
  const rooms = Array.from(io.sockets.adapter.rooms.keys());

  for (const roomName of rooms) {
    if (roomName.startsWith("session:")) {
      const sessionId = roomName.split(":")[1];

      const startTime = await getSessionStartTime(sessionId);
      if (!startTime) continue;

      const elapsedTime = (Date.now() - startTime) / 1000;
      io.to(roomName).emit("elapsedTime", { elapsedTime });
    }
  }
}, 1000);

// Démarrer le serveur sur le port défini
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur en écoute sur http:// 192.168.1.69:${PORT}`);
});

module.exports = { app, server, io, socketUsers };
