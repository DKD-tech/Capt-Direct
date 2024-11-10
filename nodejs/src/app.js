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

  // Rejoindre une session vidéo
  socket.on("joinVideoSession", ({ userId, userName, videoId }) => {
    socket.join(videoId);
    users[userId] = { userName, videoId };
    io.in(videoId).emit("userJoined", { userId, userName });
    console.log(`User ${userName} joined video ${videoId}`);
  });

  // Quitter une session vidéo
  socket.on("leaveVideoSession", ({ userId, videoId }) => {
    socket.leave(videoId);
    io.in(videoId).emit("userLeft", {
      userId,
      userName: users[userId].userName,
    });
    delete users[userId];
    console.log(`User ${userId} left video ${videoId}`);
  });

  // Gestion des sous-titres en temps réel
  socket.on("editSubtitle", (subtitle) => {
    console.log("Sous-titre reçu côté serveur :", subtitle);
    subtitles[subtitle.videoId] = subtitles[subtitle.videoId] || [];
    subtitles[subtitle.videoId].push(subtitle);
    io.in(subtitle.videoId).emit("updateSubtitle", subtitle);
  });

  // Suppression des sous-titres
  socket.on("deleteSubtitle", ({ subtitleId, videoId }) => {
    subtitles[videoId] = subtitles[videoId].filter((s) => s.id !== subtitleId);
    io.in(videoId).emit("subtitleDeleted", { subtitleId });
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

  // /**
  //  * S'assurer qu'une et seul transcripteur n'ouvrepas pas deux fênetre afin de
  //  * transcrire sur deux vidéo differente. Nous ne voulons pas laisser un pipitreur en même temps sur la même vidéo, donc s'ils changent de navigateur
  //  * et ouvre une autre vidéo nous devons quitter le dashboard precedent et rejoindre la nouvelle
  //  * */

  // // Fonction pour quitter une vidéo précédente et rejoindre une nouvelle
  // const safeJoin = (currentId) => {
  //   if (previousId) {
  //     socket.leave(previousId); // Quitter l'ancienne vidéo
  //   }
  //   socket.join(currentId); // Rejoindre la nouvelle vidéo
  //   console.log(`Socket ${socket.id} rejoint la vidéo ${currentId}`);
  //   previousId = currentId; // Mettre à jour l'ID précédent
  // };

  // Mise à jour des utilisateurs actifs lorsqu'un utilisateur se connecte
  // updateActiveUsers();

  // Type d'évenements que notre socket écoute de la part du client :
  /**
   * getVidéo : Lorsque le client emet le getVidéo, la prise va prendre la charge utile ( dans notre cas, c'est juste un id)
   * rejoignez une vidéo avec cette videoId, et émettre les stockés vidéo retout au client initiateur uniquement.
   */

  // Gestion des événements Socket.io

  // Événement : rejoindre une vidéo spécifique
  // socket.on("getVideo", (videoId) => {
  //   if (videos[videoId]) {
  //     // Vérifie si la vidéo existe
  //     safeJoin(videoId);
  //     socket.emit("video", videos[videoId]); // Envoyer la vidéo spécifique au client demandeur
  //   } else {
  //     socket.emit("error", { message: "Vidéo non trouvée." });
  //   }
  // });

  /**
   * addVideo : la charge utile est une vidéo objet, qui, à l'heure actuelle, n'est constitué que d'une id générée par le client.
   * Nous disons à notre socket de rejoindre la vidéo afin que les modifications futures puissent être diffusées à n'importe qui
   * dans le même video ( même pièce).
   * Ensuite nous voulons que tout le monde connécté à notre serveur sache qu'il y'a une nouvelle vidéo avec lequle transcrire, donc nous retransmettons à tous les clients avec le io.emit('videos',...)
   * fonction.
   */

  // Événement : ajouter une nouvelle vidéo
  // socket.on("addVideo", (vid) => {
  //   // Ajouter la nouvelle vidéo à la liste globale
  //   videos[vid.id] = vid;
  //   safeJoin(vid.id);
  //   // Diffuser la liste mise à jour des vidéos à tous les clients
  //   io.emit("videos", Object.keys(videos));
  //   // Envoyer la nouvelle vidéo au client qui l'a ajoutée
  //   socket.emit("video", vid);
  // });

  /**
   * Note: difference entre socket.emit() et io.emit()
   * La socket la version est destinée à emetrre de nouveau pour ne lancer qu'au client,
   * io une version est destinée à emettre à tous ceux qui sont connectés à notre serveur.
   */

  // Type d'évènement qui sont émis par notre socket au client
  /**
   * editVideo : Avec cet évènement, la charge utile sera l'ensemble de la vidéo à son état après toute frappe.
   * Nous remplecerons la vidéo existant dans la base de données, puis nous diffuserons la nouvelle vidéo
   * et en bas le sous titre qu'aux clients qui sont actuellement sur la vidéo ou le consulte. Nous le faisons en appellant
   * socket.to(vid.id).emit(video, vid), qui émet à touts les prises dans cette pièce particulière (la video en question).
   */

  // Événement : éditer une vidéo existante
  // socket.on("editVideo", (vid) => {
  //   if (videos[vid.id]) {
  //     // Vérifie si la vidéo existe avant de l'éditer
  //     // Mettre à jour la vidéo existante avec les nouvelles modifications
  //     videos[vid.id] = vid;
  //     // Diffuser la vidéo mise à jour aux clients connectés à cette vidéo
  //     socket.to(vid.id).emit("video", vid);
  //   } else {
  //     socket.emit("error", { message: "Vidéo non trouvée." });
  //   }
  // });

  // Événement : éditer les sous-titres en direct
  socket.on("editSubtitle", (subtitle) => {
    console.log("Sous-titre reçu côté serveur :", subtitle);
    // Diffuse le sous-titre à tous les utilisateurs dans la salle actuelle
    io.emit("updateSubtitle", subtitle);
    // io.in(subtitle.videoId).emit("updateSubtitle", subtitle);
  });

  // // Gestion de la déconnexion de l'utilisateur
  // socket.on("disconnect", () => {
  //   console.log(`Socket ${socket.id} est déconnecté`);
  //   updateActiveUsers(); // Mettre à jour la liste des utilisateurs actifs
  // });

  // Gestion de la déconnexion de l'utilisateur
  socket.on("disconnect", () => {
    const userId = Object.keys(users).find(
      (id) => users[id].socketId === socket.id
    );
    if (userId) {
      const { videoId, userName } = users[userId];
      socket.leave(videoId);
      io.in(videoId).emit("userLeft", { userId, userName });
      delete users[userId];
    }
    console.log(`Socket ${socket.id} est déconnecté`);
  });
});
/**
 * Enfin, chaque fois qu'une nouvelle connexion est établie, nous retransmettons à tous les cliens pour s'assurer que la nouvelle
 * connexion recoit les dernières modifications de vidéo lorsqu'il se connectent
 */

//   // À chaque nouvelle connexion, envoyer la liste des vidéos à tous les clients
//   io.emit("videos", Object.keys(videos));
//   console.log(`Socket ${socket.id} est connecté`);
// });

// const redisClient = require('redis').createClient();
// const ttl = 10; // Temps de vie en secondes

// // Fonction pour ajouter un sous-titre dans Redis
// function addSubtitleToRedis(projectId, segmentId, startTime, endTime, text) {
//     const key = `sous_titre:${projectId}:${segmentId}:${startTime}:${endTime}`;
//     redisClient.set(key, text, 'EX', ttl); // Expire après 10 secondes
// }

/**
 * Après que les fonctions de socket sont mises en place, un port pour l'ecouter
 */

// Démarrer le serveur sur le port défini
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur http://localhost:${PORT}`);
});
