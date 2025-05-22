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
  startSegmentationController,
  stopSegmentationController,
  handleUserDisconnection,
} = require("../controllers/stc/videoSegmentController");
const {
  assignSegmentsToUsers,

  redistributeSegments,
} = require("../controllers/stc/assignSegmentController");
const {
  addSubtitle,
  getSubtitlesBySegment,
} = require("../controllers/stc/segmentUsersController");
const { startStream } = require("../controllers/rtmp/streamController");

const authMiddleware = require("../middlewares/authMiddleware");

const sessionRouter = express.Router();

sessionRouter.post("/create-session", createSessionController);
sessionRouter.post("/create-segment", createVideoSegmentController);
sessionRouter.post("/assign-user", redistributeSegments);
sessionRouter.post("/assign-user-seg", assignSegmentsToUsers);
sessionRouter.post("/user-disconnect", handleUserDisconnection);
sessionRouter.post("/disconnect-user", handleUserDisconnection);
sessionRouter.post("/add-subtitle", addSubtitle);
sessionRouter.get("/get-subtitles/:segment_id", getSubtitlesBySegment);
sessionRouter.post("/generate-hls", createHlsSegmentsController);
//sessionRouter.post("/start", streamSessions);
sessionRouter.post("/start-stream/:sessionId", startStream);
sessionRouter.post(
  "/start-segmentation/:sessionId",
  startSegmentationController
);
sessionRouter.post("/stop-segmentation/:sessionId", stopSegmentationController);

sessionRouter.get("/:session_id", getSegmentsWithSubtitles);
sessionRouter.get(
  "/segments/:session_id",
  authMiddleware,
  getSegmentsWithSubtitles
);
sessionRouter.get("/info/:sessionId", getSessionController);
sessionRouter.post("/store-duration/:sessionId", storeVideoDurationController);
sessionRouter.post("/get-duration/:sessionId", getVideoDuration);
// sessionRouter.post("/stream/:sessionId", startStreaming);

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

sessionRouter.post("/segments/:segment_id/subtitles", async (req, res) => {
  const { segment_id } = req.params;
  const { text } = req.body;

  if (!segment_id || !text) {
    return res.status(400).json({ message: "Segment ID et texte requis." });
  }

  try {
    console.log(`Ajout du sous-titre pour le segment ${segment_id}`);

    const subtitle = await SubtitlesModel.insert({
      segment_id,
      text,
      created_at: new Date(),
    });

    return res.status(201).json({ message: "Sous-titre ajouté.", subtitle });
  } catch (error) {
    console.error("Erreur lors de l'ajout du sous-titre :", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = sessionRouter;
