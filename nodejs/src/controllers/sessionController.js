const SubtitleModel = require("../models/SubtitleModel");

async function saveSubtitle(req, res) {
  try {
    const { segment_id, start_time, end_time, text, created_by } = req.body;

    // Validation des champs obligatoires
    if (!segment_id || !start_time || !end_time || !text || !created_by) {
      return res.status(400).json({ error: "Tous les champs sont requis." });
    }

    // Préparation des données
    const subtitleData = { segment_id, start_time, end_time, text, created_by };

    // Ajout du sous-titre via le modèle
    const newSubtitle = await SubtitleModel.addSubtitle(subtitleData);

    // Réponse au client
    res.status(201).json({ message: "Sous-titre ajouté avec succès.", subtitle: newSubtitle });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du sous-titre :", error);
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
}

async function getSubtitles(req, res) {
  try {
    const { segment_id } = req.params;

    // Validation du paramètre
    if (!segment_id) {
      return res.status(400).json({ error: "Le segment_id est requis." });
    }

    // Récupération des sous-titres via le modèle
    const subtitles = await SubtitleModel.getSubtitlesBySegment(segment_id);

    // Réponse au client
    res.status(200).json(subtitles);
  } catch (error) {
    console.error("Erreur lors de la récupération des sous-titres :", error);
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
}

module.exports = {
  saveSubtitle,
  getSubtitles,
};
