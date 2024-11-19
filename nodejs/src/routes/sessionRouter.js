const express = require("express");
const {
  createSessionController,
  getSessionController,
} = require("../controllers/stc/creationSessionController");
const {
  createVideoSegmentController,
} = require("../controllers/stc/videoSegmentController");

const {
  assignUserToSegmentController,
} = require("../controllers/stc/segmentUsersController");

const sessionRouter = express.Router(); // Assurez-vous de nommer correctement le routeur

// Route pour créer une session
sessionRouter.post("/create-session", createSessionController);

// Route pour récupérer les informations d'une session
sessionRouter.get("/:sessionId", getSessionController);

// Route pour créer un segment vidéo
sessionRouter.post("/create-segment", createVideoSegmentController);

//Route pour assigner un utilisateur à un segment
sessionRouter.post("/assign-user", assignUserToSegmentController);

module.exports = sessionRouter; // Export correct du routeur
