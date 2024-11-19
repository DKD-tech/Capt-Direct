const VideoSegmentModel = require("../../models/VideoSegmentModel");

async function createVideoSegmentController(req, res) {
  const { session_id, start_time, end_time, status } = req.body;

  if (!session_id || !start_time || !end_time) {
    return res
      .status(400)
      .json({ message: "Les champs obligatoires sont manquants" });
  }

  try {
    const segment = await VideoSegmentModel.insert({
      session_id,
      start_time,
      end_time,
      status: status || "available", // statut par défaut
      created_at: new Date(),
    });
    return res.status(201).json({
      message: "Segment vidéo crée avec succès",
      segment: segment,
    });
  } catch (error) {
    console.error("Erreur lors de la création du segment :", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

module.exports = { createVideoSegmentController };
