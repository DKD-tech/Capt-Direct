const SessionModel = require("../../models/SessionModel");

// Contrôleur pour créer une session
const createSessionController = async (req, res) => {
  const { session_name, description, video_url, status } = req.body;

  if (!session_name || !video_url || !status) {
    return res.status(400).json({ message: "Champs obligatoires manquants" });
  }

  try {
    const newSession = await SessionModel.insert({
      session_name,
      description,
      video_url,
      created_at: new Date(), // Génère automatiquement la date de création
      status,
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

// Contrôleur pour récupérer une session par ID
const getSessionController = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await SessionModel.findOneById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session introuvable" });
    }

    return res.status(200).json(session);
  } catch (error) {
    console.error("Erreur lors de la récupération de la session :", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = { createSessionController, getSessionController };
