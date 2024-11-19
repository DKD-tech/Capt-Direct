const SegmentUserModel = require("../../models/SegmentUserModel");

async function assignUserToSegmentController(req, res) {
  const { user_id, segment_id } = req.body;

  if (!user_id || !segment_id) {
    return res
      .status(400)
      .json({ message: "Les champs obligatoires sont manquants" });
  }

  try {
    // Vérifiez si l'utilisateur est déjà assigné
    const existingAssignment = await SegmentUserModel.findOneBy({
      segment_id,
      user_id,
    });

    if (existingAssignment) {
      return res
        .status(400)
        .json({ message: "L'utilisateur est déjà assigné à ce segment" });
    }

    // Assigner l'utilisateur au segment
    const newAssignment = await SegmentUserModel.insert({
      segment_id,
      user_id,
      assigned_at: new Date(),
    });
    return res.status(201).json({
      message: "Utilisateur assigné au segment avec succès",
      assignment: newAssignment,
    });
  } catch (error) {
    console.error(
      "Erreur lors de l'assignation de l'utilisateur au segment :",
      error
    );
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

module.exports = { assignUserToSegmentController };
