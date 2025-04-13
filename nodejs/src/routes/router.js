const { Router } = require("express");
const authRouter = require("./authRouter");
const sessionRouter = require("./sessionRouter");
const healthController = require("../controllers/healthController");
const sessionController = require("../controllers/sessionController");
const authMiddleware = require("../middlewares/authMiddleware");
const userRouter = require("./userRouter");


const router = Router({ mergeParams: true });

// Route de santé
router.get("/health", healthController);

//router.use('/stream', streamRouter);
// Routes d'authentification
router.use("/auth", authRouter);

// Routes utilisateur (protégées)
router.use("/user", authMiddleware, userRouter);

// router.use("/user", authRouter );

// Route de session (protégée)
router.get("/session", authMiddleware, sessionController);

// Routes pour les sessions
router.use("/sessions", sessionRouter);

// Route pour les segments vidéo
router.use("/video-segment", sessionRouter);

// Gestion des erreurs 404 pour les routes non trouvées
router.use((_, res) => {
  return res.status(404).json({ message: "Not Found" });
});

module.exports = router;
