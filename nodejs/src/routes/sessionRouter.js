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
} = require("../controllers/stc/videoSegmentController");
const {
  assignDynamicSegment,
} = require("../controllers/stc/assignSegmentController");

const sessionRouter = express.Router();

sessionRouter.post("/create-session", createSessionController);
sessionRouter.post("/create-segment", createVideoSegmentController);
sessionRouter.post("/assign-user", assignDynamicSegment);

module.exports = sessionRouter;
