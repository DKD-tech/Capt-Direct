// const express = require("express");
// const {
//   createSessionController,
//   getSessionController,
// } = require("../controllers/stc/creationSessionController");
// const {
//   createVideoSegmentController,
// } = require("../controllers/stc/videoSegmentController");

// const {
//   assignUserToSegmentController,
// } = require("../controllers/stc/segmentUsersController");

// const sessionRouter = express.Router(); // Assurez-vous de nommer correctement le routeur

// // Route pour créer une session
// sessionRouter.post("/create-session", createSessionController);

// // Route pour récupérer les informations d'une session
// sessionRouter.get("/:sessionId", getSessionController);

// // Route pour créer un segment vidéo
// sessionRouter.post("/create-segment", createVideoSegmentController);

// // Route pour créer un segment vidéo
// sessionRouter.post("/create-segments", async (req, res) => {
//   const { session_id, video_duration } = req.body;

//   if (!session_id || !video_duration) {
//     return res
//       .status(400)
//       .json({ message: "Session ID et durée video requis" });
//   }
// });

// //Route pour assigner un utilisateur à un segment
// sessionRouter.post("/assign-segment", assignUserToSegmentController);

// module.exports = sessionRouter; // Export correct du routeur

const express = require("express");
const {
  createSessionController,
  getSessionController,
} = require("../controllers/stc/creationSessionController");
const {
  createVideoSegmentController,
  createHlsSegmentsController,
  getSegmentsWithSubtitles,
  storeVideoDurationController,
  getVideoDuration,
  startStreaming,
} = require("../controllers/stc/videoSegmentController");
const {
  assignSegmentsToUsers,
  handleUserDisconnection,
} = require("../controllers/stc/assignSegmentController");
const {
  addSubtitle,
  getSubtitlesBySegment,
  getSubtitlesBySession,

} = require("../controllers/stc/segmentUsersController");
const { streamSessions } = require("../controllers/rtmp/streamController");
const VideoSegmentModel = require("../models/VideoSegmentModel");

const sessionRouter = express.Router();

sessionRouter.post("/create-session", createSessionController);

// Route modifiée pour intégrer resetInactiveSegments
sessionRouter.post("/create-segment", async (req, res) => {
  const { session_id } = req.body;

  if (!session_id) {
    return res.status(400).json({ message: "Session ID est requis." });
  }

  try {
    console.log(`Appel de /create-segment pour la session ${session_id}`);

    // Étape 1 : Réinitialiser les segments inactifs
    console.log("Réinitialisation des segments inactifs...");
    const resetSegments = await VideoSegmentModel.resetInactiveSegments(5); // 5 minutes d'inactivité
    console.log("Segments réinitialisés :", resetSegments);

    // Étape 2 : Créer ou assigner des segments (appel au contrôleur existant)
    await createVideoSegmentController(req, res);
  } catch (error) {
    console.error("Erreur lors de la création des segments :", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

sessionRouter.post("/assign-user-seg", assignSegmentsToUsers);
sessionRouter.post("/disconnect-user", handleUserDisconnection);
sessionRouter.post("/add-subtitle", addSubtitle);
sessionRouter.get("/get-subtitles/:segment_id", getSubtitlesBySegment);
sessionRouter.post("/generate-hls", createHlsSegmentsController);
sessionRouter.post("/start", streamSessions);
sessionRouter.get("/:session_id", getSegmentsWithSubtitles);
sessionRouter.get("/info/:sessionId", getSessionController);
sessionRouter.post("/store-duration/:sessionId", storeVideoDurationController);
sessionRouter.post("/get-duration/:sessionId", getVideoDuration);
sessionRouter.post("/stream/:sessionId", startStreaming);
// Route pour valider un sous-titre
//sessionRouter.post("/validate-subtitle", validateSubtitleWords);
sessionRouter.get("/subtitles/:session_id", getSubtitlesBySession);
// Récupérer les utilisateurs connectés
sessionRouter.get("/connected-users/:session_id", async (req, res) => {
  const { session_id } = req.params;

  try {
    const connectedUsers = await findConnectedUsersRedis(session_id);
    res.status(200).json({ connectedUsers });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des utilisateurs connectés :",
      error
    );
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// Réinitialiser les segments inutilisés
sessionRouter.post("/reset-inactive-segments", async (req, res) => {
  const { session_id, inactivityLimit } = req.body;

  if (!session_id || !inactivityLimit) {
    return res.status(400).json({ message: "Session ID et limite d'inactivité sont requis." });
  }

  try {
    const resetSegments = await VideoSegmentModel.resetInactiveSegments(inactivityLimit);
    res.status(200).json({
      message: "Segments inutilisés réinitialisés avec succès.",
      resetSegments,
    });
  } catch (error) {
    console.error("Erreur lors de la réinitialisation des segments inutilisés :", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// Signaler le début de transcription
sessionRouter.post("/start-transcription", async (req, res) => {
  const { segment_id } = req.body;

  if (!segment_id) {
    return res.status(400).json({ message: "Segment ID est requis." });
  }

  try {
    const updatedSegment = await VideoSegmentModel.markSegmentInProgress(segment_id);
    res.status(200).json({
      message: "Le segment est maintenant en transcription.",
      segment: updatedSegment,
    });
  } catch (error) {
    console.error("Erreur lors du passage du segment en transcription :", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = sessionRouter;
