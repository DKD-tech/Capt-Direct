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
} = require("../controllers/stc/creationSessionController");
const {
  createVideoSegmentController,
  createHlsSegmentsController,
  getSegmentsWithSubtitles,
} = require("../controllers/stc/videoSegmentController");
const {
  assignDynamicSegment,
  handleUserDisconnection,
} = require("../controllers/stc/assignSegmentController");
const {
  addSubtitle,
  getSubtitlesBySegment,
} = require("../controllers/stc/segmentUsersController");
const { streamSessions } = require("../controllers/rtmp/streamController");

const sessionRouter = express.Router();

sessionRouter.post("/create-session", createSessionController);
sessionRouter.post("/create-segment", createVideoSegmentController);
sessionRouter.post("/assign-user", assignDynamicSegment);
sessionRouter.post("/disconnect-user", handleUserDisconnection);
sessionRouter.post("/add-subtitle", addSubtitle);
sessionRouter.get("/get-subtitles/:segment_id", getSubtitlesBySegment);
sessionRouter.post("/generate-hls", createHlsSegmentsController);
sessionRouter.post("/start", streamSessions);
sessionRouter.get("/:session_id", getSegmentsWithSubtitles);
// Récupérer les segments assignés avec URLs HLS
sessionRouter.get("/assigned-segments/:user_id", async (req, res) => {
  const { user_id } = req.params;

  try {
    const assignments = await SegmentUserModel.findAssignmentsByUser(user_id);

    const segmentsWithHLS = assignments.map((assignment) => ({
      ...assignment,
      hls_url: `/hls/session-${assignment.session_id}/playlist-${assignment.segment_id}.m3u8`,
    }));

    res.status(200).json({
      message: "Segments assignés récupérés avec succès.",
      segments: segmentsWithHLS,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des segments assignés :",
      error
    );
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = sessionRouter;
