const VideoSegmentModel = require("../../models/VideoSegmentModel");
const SegmentUserModel = require("../../models/SegmentUserModel");

async function assignSegmentController(req, res) {
  const { userId, sessionId } = req.body; // Assurez-vous que ces paramètres sont extraits correctement

  if (!userId || !sessionId) {
    console.error("User ID et Session ID sont requis");
    return res
      .status(400)
      .json({ message: "User ID et Session ID sont requis" });
  }

  try {
    // Log pour vérifier les données reçues
    console.log("Requête assign-segment :", req.body);

    // Vérifier l'existence de segments disponibles
    const segment = await VideoSegmentModel.findAvailableSegment(sessionId);

    if (!segment) {
      console.error("Aucun segment disponible");
      return res.status(404).json({ message: "Aucun segment disponible" });
    }

    // Marquer le segment comme en cours de traitement
    await VideoSegmentModel.markSegmentInProgress(segment.segment_id);

    // Assigner l'utilisateur au segment
    const assignment = await SegmentUserModel.assignUserToSegment(
      userId,
      segment.segment_id
    );

    return res.status(200).json({ segment: assignment });
  } catch (error) {
    console.error("Erreur serveur :", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

module.exports = { assignSegmentController };
