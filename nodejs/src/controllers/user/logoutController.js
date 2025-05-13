const Redis = require("../../redis/index");
const { getAsync, deleteSession } = require("../../redis/index");
// const { io } = require("../../app"); // WebSocket centralisé
// async function logoutController(req, res) {
//   try {
//     if (!req.user || !req.user.id) {
//       console.log("Utilisateur non authentifié ou ID utilisateur manquant");
//       return res.status(400).json({ message: "User not authenticated" });
//     }
//     const userId = req.user.id;
//     console.log("ID utilisateur pour la déconnexion:", userId);
//     // Supprime la session de l'utilisateur de Redis
//     const result = await Redis.deleteSession(userId);
//     console.log("Résultat de la suppression dans Redis:", result);

//     if (result === 0) {
//       console.warn(
//         "Aucune session trouvée pour cet ID utilisateur dans Redis."
//       );
//       return res
//         .status(400)
//         .json({ message: "Session non trouvée pour cet utilisateur." });
//     }

//     res.status(200).json({ message: "Déconnexion réussie" });
//   } catch (error) {
//     console.error("Erreur lors de la déconnexion:", error);
//     res.sendStatus(500);
//   }
// }
// async function logoutController(req, res) {
//   try {
//     if (!req.user || !req.user.id) {
//       console.log("Utilisateur non authentifié ou ID utilisateur manquant");
//       return res.status(400).json({ message: "User not authenticated" });
//     }

//     const userId = req.user.id;
//     console.log("ID utilisateur pour la déconnexion:", userId);

//     const io = req.app.get("io");
//     //  Récupérer le socketId via Redis
//     const socketId = await getAsync(`socket:${userId}`);
//     if (socketId) {
//       const socket = io.sockets.sockets.get(socketId);
//       if (socket) {
//         console.log(`Déconnexion manuelle du socket ${socketId}`);
//         socket.disconnect(true); // force la fermeture
//       }
//     } else {
//       console.warn("Aucun socketId trouvé dans Redis pour cet utilisateur");
//     }

//     //  Supprimer la session Redis
//     const result = await deleteSession(userId);
//     console.log("Résultat de la suppression dans Redis:", result);

//     if (result === 0) {
//       return res.status(400).json({
//         message: "Session non trouvée pour cet utilisateur.",
//       });
//     }

//     return res.status(200).json({ message: "Déconnexion réussie" });
//   } catch (error) {
//     console.error("Erreur lors de la déconnexion:", error);
//     res.sendStatus(500);
//   }
// }

async function logoutController(req, res) {
  try {
    if (!req.user || !req.user.id) {
      console.log("Utilisateur non authentifié ou ID utilisateur manquant");
      return res.status(400).json({ message: "User not authenticated" });
    }

    const userId = req.user.id;
    const io = req.app.get("io");
    const socketUsers = require("../../app").socketUsers; // ← à exposer

    const socketId = socketUsers.get(userId);
    if (socketId) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        console.log(`🧹 Déconnexion manuelle du socket ${socketId}`);
        socket.disconnect(true); // force fermeture
      }
      socketUsers.delete(userId); // Nettoie la map
    }

    res.status(200).json({ message: "Déconnexion réussie" });
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    res.sendStatus(500);
  }
}

module.exports = logoutController;
