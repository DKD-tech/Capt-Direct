const { client: redisClient } = require("../../redis/index"); // adapte ce chemin si nécessaire

// Lancer le flux pour une session (avec 5s de compte à rebours)
const startStream = async (req, res) => {
  const sessionId = req.params.sessionId;
  const countdownSeconds = 5;

  const officialStartTime = Date.now() + countdownSeconds * 1000;

  // Enregistrer le startTime dans Redis
  await redisClient.set(
    `session:${sessionId}:startTime`,
    officialStartTime.toString()
  );

  const io = req.app.get("io");
  io.to(`session:${sessionId}`).emit("stream-started", {
    startTime: officialStartTime,
  });

  return res.status(200).json({
    message: "Flux démarré avec succès",
    startTime: officialStartTime,
  });
};

// Récupérer le startTime depuis Redis
const getSessionStartTime = async (sessionId) => {
  const stored = await redisClient.get(`session:${sessionId}:startTime`);
  return stored ? parseInt(stored, 10) : null;
};

module.exports = {
  startStream,
  getSessionStartTime,
};
