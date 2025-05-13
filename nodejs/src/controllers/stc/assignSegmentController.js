const VideoSegmentModel = require("../../models/VideoSegmentModel");
const SegmentUserModel = require("../../models/SegmentUserModel");
const { getConnectedUsers } = require("../../utils/socketUtils");

async function assignDynamicSegment(req, res) {
  const { user_id, session_id } = req.body;

  if (!user_id || !session_id) {
    return res
      .status(400)
      .json({ message: "Les champs obligatoires sont manquants" });
  }

  try {
    // Étape 1 : Récupérer les segments disponibles pour la session
    const availableSegments = await VideoSegmentModel.findManyBy({
      session_id,
      status: "available",
    });

    if (!availableSegments || availableSegments.length === 0) {
      return res.status(200).json({
        message: "Aucun segment disponible pour cette session.",
      });
    }

    // Étape 2 : Vérifier si l'utilisateur a déjà un segment assigné
    const userAssignments =
      await SegmentUserModel.findAssignmentsByUserAndSession(
        user_id,
        session_id
      );

    if (userAssignments.length > 0) {
      return res.status(200).json({
        message: "Utilisateur déjà assigné à des segments.",
        assignedSegments: userAssignments,
      });
    }

    // Étape 3 : Trouver le premier segment disponible
    const segmentToAssign = availableSegments[0]; // Le premier segment disponible

    // Étape 4 : Assigner ce segment à l'utilisateur
    const newAssignment = await SegmentUserModel.assignUserToSegment(
      user_id,
      segmentToAssign.segment_id
    );

    // Mettre à jour le statut du segment en "in_progress"
    await VideoSegmentModel.updateOneById(segmentToAssign.segment_id, {
      status: "in_progress",
    });

    return res.status(201).json({
      message: "Segment assigné avec succès.",
      segment: segmentToAssign,
      assignment: newAssignment,
    });
  } catch (error) {
    console.error("Erreur lors de l'assignation des segments :", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

async function redistributeSegments(session_id) {
  try {
    const usersInSession = connectedUsers[session_id] || [];
    if (usersInSession.length === 0) {
      console.log(`Aucun utilisateur connecté dans la session ${session_id}`);
      return;
    }

    // Récupérer les segments de la session
    const segments = await VideoSegmentModel.findManyBy({ session_id });

    // Réinitialiser les segments "in_progress" pour redistribuer
    const segmentsToRedistribute = segments.filter(
      (segment) => segment.status === "in_progress"
    );

    console.log(
      `Redistribution des segments pour la session ${session_id}:`,
      segmentsToRedistribute
    );

    // Réattribuer les segments aux utilisateurs connectés
    const assignments = [];
    segmentsToRedistribute.forEach((segment, index) => {
      const user = usersInSession[index % usersInSession.length];
      assignments.push({
        user_id: user.user_id,
        segment_id: segment.segment_id,
        assigned_at: new Date(),
      });
    });

    // Mettre à jour la base de données
    await Promise.all(
      assignments.map(async (assignment) => {
        // Assigner à un nouvel utilisateur
        await SegmentUserModel.assignUserToSegment(
          assignment.user_id,
          assignment.segment_id
        );

        // Marquer le segment comme "in_progress"
        await VideoSegmentModel.markSegmentInProgress(assignment.segment_id);
      })
    );

    console.log(`Redistribution effectuée pour la session ${session_id}`);
  } catch (error) {
    console.error("Erreur lors de la redistribution des segments :", error);
  }
}

async function handleUserDisconnection({ user_id, session_id }) {
  try {
    console.log(
      `Déconnexion de l'utilisateur ${user_id} dans la session ${session_id}`
    );

    // Récupérer les segments assignés à l'utilisateur
    const userSegments = await SegmentUserModel.findAssignmentsByUserAndSession(
      user_id,
      session_id
    );

    // Supprimer les assignations de cet utilisateur
    await SegmentUserModel.deleteAssignmentsByUser(user_id);

    // Identifier les utilisateurs connectés restants
    const connectedUsers = await getConnectedUsers(io, session_id);

    if (connectedUsers.length === 0) {
      // Si aucun utilisateur connecté, remettre les segments en "available"
      for (const segment of userSegments) {
        await VideoSegmentModel.updateOneById(segment.segment_id, {
          status: "available",
        });
      }
      console.log("Aucun utilisateur connecté, segments remis disponibles.");
      return userSegments;
    }

    // Redistribuer les segments équitablement
    const totalUsers = connectedUsers.length;
    for (const [index, segment] of userSegments.entries()) {
      const userToAssign = connectedUsers[index % totalUsers];
      await SegmentUserModel.assignUserToSegment(
        userToAssign.user_id,
        segment.segment_id
      );
      await VideoSegmentModel.markSegmentInProgress(segment.segment_id);
    }

    console.log("Segments redistribués avec succès.");
    return userSegments;
  } catch (error) {
    console.error("Erreur lors de la gestion de la déconnexion :", error);
    throw error;
  }
}

async function assignSegmentsToUsers(session_id, createdSegments) {
  try {
    // Étape 1 : Récupérer les utilisateurs connectés via Socket.IO
    const usersInSession = await getConnectedUsers(io, session_id);

    if (!usersInSession || usersInSession.length === 0) {
      throw new Error("Aucun utilisateur connecté pour cette session.");
    }

    console.log("Utilisateurs connectés :", usersInSession);

    // Étape 2 : Assigner les segments de manière cyclique
    const assignments = [];
    const totalUsers = usersInSession.length;

    createdSegments.forEach((segment, index) => {
      if (!segment.segment_id) {
        throw new Error(`Segment invalide : ${JSON.stringify(segment)}`);
      }
      const userId = usersInSession[index % totalUsers].user_id; // Répartition équitable
      assignments.push({
        user_id: userId,
        segment_id: segment.segment_id,
        assigned_at: new Date(),
      });
    });

    console.log("Assignations générées :", assignments);

    // Étape 3 : Enregistrer les assignations dans la base de données
    await Promise.all(
      assignments.map(async (assignment) => {
        console.log(
          `Enregistrement de l'assignation : ${JSON.stringify(assignment)}`
        );
        await SegmentUserModel.assignUserToSegment(
          assignment.user_id,
          assignment.segment_id
        );

        // Mettre à jour le statut du segment
        const updatedSegment = await VideoSegmentModel.markSegmentInProgress(
          assignment.segment_id
        );
        console.log(`Segment mis à jour :`, updatedSegment);

        console.log(
          `Segment ${assignment.segment_id} assigné à l'utilisateur ${assignment.user_id}`
        );
      })
    );

    return assignments;
  } catch (error) {
    console.error("Erreur lors de l'assignation des segments :", error);
    throw error;
  }
}

async function assignSegment(req, res) {
  const { user_id, session_id } = req.body;

  if (!user_id || !session_id) {
    return res.status(400).json({ message: "Champs obligatoires manquants." });
  }

  try {
    const availableSegments = await VideoSegmentModel.findAvailableSegments(
      session_id
    );

    if (availableSegments.length === 0) {
      return res.status(404).json({ message: "Aucun segment disponible." });
    }

    const assignedSegment = availableSegments[0];
    await SegmentUserModel.assignUserToSegment(
      user_id,
      assignedSegment.segment_id
    );
    await VideoSegmentModel.markSegmentInProgress(assignedSegment.segment_id);

    return res.status(201).json({
      message: "Segment assigné avec succès.",
      segment: assignedSegment,
    });
  } catch (error) {
    console.error("Erreur lors de l'assignation :", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

module.exports = {
  assignDynamicSegment,
  handleUserDisconnection,
  assignSegmentsToUsers,
  redistributeSegments,
  assignSegment,
};
