const SessionModel = require("../../models/SessionModel");

// Contrôleur pour créer une session
const createSessionController = async (req, res) => {
  const { session_name, description, video_url, status } = req.body;

  if (!session_name || !video_url) {
    return res.status(400).json({ message: "Champs obligatoires manquants" });
  }

  // Vérifier si la vidéo existe (pour les vidéos locales) process.env.videoDirectory
  const videoDirectory = "/videos/";
  const videoPath = `${video_url}`;

  // if (!fs.existsSync(videoPath)) {
  //   console.error(`La vidéo est introuvable dans : ${videoPath}`);
  //   return res.status(400).json({
  //     message: `La vidéo ${video_url} n'existe pas dans le chemin ${videoDirectory}.`,
  //   });
  // }

  try {
    const newSession = await SessionModel.insert({
      session_name,
      description,
      video_url: videoPath,
      created_at: new Date(), // Génère automatiquement la date de création
      status: status || "active",
    });

    return res.status(201).json({
      message: "Session créée avec succès",
      session: newSession,
    });
  } catch (error) {
    console.error("Erreur lors de la création de la session :", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

async function createOrValidateSession(req, res) {
  const { video_name, hls_url } = req.body;

  if (!video_name || !hls_url) {
    return res
      .status(400)
      .json({ message: "Nom de la vidéo et URL HLS requis." });
  }

  try {
    const existingSession = await SessionModel.findOneBy({ video_name });
    if (existingSession) {
      return res.status(200).json({
        message: "Session existante validée.",
        session_id: existingSession.session_id,
      });
    }

    const newSession = await SessionModel.insert({
      session_name: video_name,
      description,
      video_url: hls_url,
      status: "active",
      created_at: new Date(),
    });

    return res.status(201).json({
      message: "Session créée avec succès.",
      session_id: newSession.session_id,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la création/validation de la session :",
      error
    );
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

// Contrôleur pour récupérer une session par ID
const getSessionController = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await SessionModel.findOneById(sessionId, "session_id");

    if (!session) {
      return res.status(404).json({ message: "Session introuvable" });
    }

    return res.status(200).json(session);
  } catch (error) {
    console.error("Erreur lors de la récupération de la session :", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = {
  createSessionController,
  getSessionController,
  createOrValidateSession,
};
