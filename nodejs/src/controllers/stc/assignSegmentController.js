// // const VideoSegmentModel = require("../../models/VideoSegmentModel");
// // const SegmentUserModel = require("../../models/SegmentUserModel");

// // async function assignSegmentController(req, res) {
// //   const { userId, sessionId } = req.body; // Assurez-vous que ces paramètres sont extraits correctement

// //   if (!userId || !sessionId) {
// //     console.error("User ID et Session ID sont requis");
// //     return res
// //       .status(400)
// //       .json({ message: "User ID et Session ID sont requis" });
// //   }

// //   try {
// //     // Log pour vérifier les données reçues
// //     console.log("Requête assign-segment :", req.body);

// //     // Vérifier l'existence de segments disponibles
// //     const segment = await VideoSegmentModel.findAvailableSegment(sessionId);

// //     if (!segment) {
// //       console.error("Aucun segment disponible");
// //       return res.status(404).json({ message: "Aucun segment disponible" });
// //     }

// //     // Marquer le segment comme en cours de traitement
// //     await VideoSegmentModel.markSegmentInProgress(segment.segment_id);

// //     // Assigner l'utilisateur au segment
// //     const assignment = await SegmentUserModel.assignUserToSegment(
// //       userId,
// //       segment.segment_id
// //     );

// //     return res.status(200).json({ segment: assignment });
// //   } catch (error) {
// //     console.error("Erreur serveur :", error);
// //     return res.status(500).json({ message: "Erreur serveur" });
// //   }
// // }

// // module.exports = { assignSegmentController };

// const VideoSegmentModel = require("../../models/VideoSegmentModel");
// const SegmentUserModel = require("../../models/SegmentUserModel");

// // async function assignDynamicSegment(userId, sessionId) {
// //   const allSegments = await VideoSegmentModel.findManyBy({
// //     session_id: sessionId,
// //   });
// //   const allUserAssignments = await SegmentUserModel.findManyBy({
// //     session_id: sessionId,
// //   });

// //   const segmentUsage = {};
// //   allUserAssignments.forEach((assignment) => {
// //     if (!segmentUsage[assignment.user_id]) {
// //       segmentUsage[assignment.user_id] = [];
// //     }
// //     segmentUsage[assignment.user_id].push(assignment.segment_id);
// //   });

// //   if (segmentUsage[userId]) {
// //     return {
// //       message: "Utilisateur déjà assigné",
// //       assignedSegments: segmentUsage[userId],
// //     };
// //   }

// //   const unassignedSegments = allSegments.filter(
// //     (segment) =>
// //       !allUserAssignments.some(
// //         (assignment) => assignment.segment_id === segment.segment_id
// //       )
// //   );

// //   if (unassignedSegments.length > 0) {
// //     const segmentToAssign = unassignedSegments[0];
// //     const newAssignment = await SegmentUserModel.insert({
// //       user_id: userId,
// //       segment_id: segmentToAssign.segment_id,
// //       assigned_at: new Date(),
// //     });
// //     await VideoSegmentModel.updateOneById(segmentToAssign.segment_id, {
// //       status: "in_progress",
// //     });

// //     return {
// //       message: "Segment assigné",
// //       assignedSegment: segmentToAssign,
// //       newAssignment,
// //     };
// //   }

// //   const allUsers = Object.keys(segmentUsage);
// //   const totalUsers = allUsers.length + 1;

// //   const redistributedSegments = [];
// //   allSegments.forEach((segment, index) => {
// //     const assignedUserId = allUsers[index % totalUsers] || userId;
// //     redistributedSegments.push({
// //       segment_id: segment.segment_id,
// //       user_id: assignedUserId,
// //     });
// //   });

// //   for (const { segment_id, user_id } of redistributedSegments) {
// //     await SegmentUserModel.insert({
// //       user_id,
// //       segment_id,
// //       assigned_at: new Date(),
// //     });
// //     await VideoSegmentModel.updateOneById(segment_id, {
// //       status: "in_progress",
// //     });
// //   }

// //   return { message: "Segments redistribués", redistributedSegments };
// // }

// // module.exports = { assignDynamicSegment };

// async function assignDynamicSegment(userId, sessionId) {
//   // Récupérer les segments disponibles pour la session
//   const allSegments = await VideoSegmentModel.findAvailableSegments(sessionId);

//   // Récupérer les assignations des utilisateurs dans cette session
//   const allUserAssignments = await SegmentUserModel.findManyBy({
//     session_id: sessionId,
//   });

//   // Grouper les segments par utilisateur
//   const segmentUsage = {};
//   allUserAssignments.forEach((assignment) => {
//     if (!segmentUsage[assignment.user_id]) {
//       segmentUsage[assignment.user_id] = [];
//     }
//     segmentUsage[assignment.user_id].push(assignment.segment_id);
//   });

//   // Vérifier si l'utilisateur a déjà des segments
//   if (segmentUsage[userId]) {
//     return {
//       message: "Utilisateur déjà assigné à un ou plusieurs segments",
//       assignedSegments: segmentUsage[userId],
//     };
//   }

//   // S'il reste des segments libres, en assigner un
//   if (allSegments.length > 0) {
//     const segmentToAssign = allSegments[0];
//     const newAssignment = await SegmentUserModel.insert({
//       user_id: userId,
//       segment_id: segmentToAssign.segment_id,
//       assigned_at: new Date(),
//     });
//     await VideoSegmentModel.markSegmentInProgress(segmentToAssign.segment_id);

//     return {
//       message: "Segment assigné à l'utilisateur",
//       assignedSegment: segmentToAssign,
//       newAssignment,
//     };
//   }

//   // Redistribuer les segments si tous sont assignés
//   const allUsers = Object.keys(segmentUsage);
//   const totalUsers = allUsers.length + 1;

//   const redistributedSegments = [];
//   allSegments.forEach((segment, index) => {
//     const assignedUserId = allUsers[index % totalUsers] || userId;
//     redistributedSegments.push({
//       segment_id: segment.segment_id,
//       user_id: assignedUserId,
//     });
//   });

//   for (const { segment_id, user_id } of redistributedSegments) {
//     await SegmentUserModel.insert({
//       user_id,
//       segment_id,
//       assigned_at: new Date(),
//     });
//     await VideoSegmentModel.updateOneById(segment_id, {
//       status: "in_progress",
//     });
//   }

//   return {
//     message: "Segments redistribués équitablement entre les utilisateurs",
//     redistributedSegments,
//   };
// }

const VideoSegmentModel = require("../../models/VideoSegmentModel");
const SegmentUserModel = require("../../models/SegmentUserModel");

async function assignDynamicSegment(req, res) {
  const { user_id, session_id } = req.body;

  if (!user_id || !session_id) {
    return res
      .status(400)
      .json({ message: "Les champs obligatoires sont manquants" });
  }

  //   try {
  //     const existingSegment = await SegmentUserModel.findUserSegment(
  //       user_id,
  //       session_id
  //     );

  //     if (existingSegment.length > 0) {
  //       return res
  //         .status(200)
  //         .json({
  //           message: "Utilisateur déjà assigné à un segment",
  //           segment: existingSegment,
  //         });
  //     }

  //     // Trouver un segment disponible
  //     const availableSegment = await VideoSegmentModel.findAvailableSegment(
  //       session_id
  //     );
  //     if (!availableSegment) {
  //       return res.status(400).json({ message: "Aucun segment disponible" });
  //     }

  //     const assignment = await SegmentUserModel.assignUserToSegment(
  //       user_id,
  //       availableSegment.segment_id
  //     );
  //     await VideoSegmentModel.markSegmentInProgress(availableSegment.segment_id);

  //     return res.status(201).json({ message: "Segment assigné avec succès", assignment });

  //   } catch (error) {
  //     console.error("Erreur lors de l'assignation :", error);
  //     return res.status(500).json({ message: "Erreur serveur" });
  //   }

  // }
  try {
    // Récupérer les segments pour la session
    const allSegments = await VideoSegmentModel.findManyBy({ session_id });
    console.log("Segments disponibles pour la session :", allSegments);

    // // Vérifier si l'utilisateur a déjà un segment
    // const existingSegments = await SegmentUserModel.findUserSegment(
    //   user_id,
    //   session_id
    // );

    // if (existingSegments.length > 0) {
    //   return res.status(200).json({
    //     message: "Utilisateur déjà assigné à un ou plusieurs segments",
    //     segments: existingSegments,
    //   });
    // }

    // Récupérer toutes les assignations existantes pour la session
    const allAssignments = await SegmentUserModel.findAssignmentsBySession(
      session_id
    );
    console.log("Assignations existantes :", allAssignments);

    // Créer une carte pour compter les utilisateurs par segment
    const segmentUsage = {}; // Compteur d'utilisateurs par segment

    allAssignments.forEach((assignment) => {
      if (!segmentUsage[assignment.segment_id]) {
        segmentUsage[assignment.segment_id] = 0;
      }
      segmentUsage[assignment.segment_id]++;
    });

    // Vérifier si l'utilisateur a déjà un segment
    const userAssignments = allAssignments.filter(
      (assignment) => assignment.user_id === user_id
    );

    if (userAssignments.length > 0) {
      return res.status(200).json({
        message: "Utilisateur déjà assigné à un ou plusieurs segments",
        assignedSegments: userAssignments,
      });
    }
    // Trouver le segment avec le moins d'utilisateurs
    let leastAssignedSegment = null;
    let minUsers = Infinity;
    for (const segment of allSegments) {
      const count = segmentUsage[segment.segment_id] || 0;
      if (count < minUsers) {
        minUsers = count;
        leastAssignedSegment = segment;
      }
    }

    // Si un segment est disponible, l'assigner
    if (leastAssignedSegment) {
      // Ajouter l'utilisateur au segment avec le moins d'utilisateurs
      const newAssignment = await SegmentUserModel.insert({
        user_id,
        segment_id: leastAssignedSegment.segment_id,
        assigned_at: new Date(),
      });

      // Mettre à jour le statut du segment en "in_progress"
      const updatedSegment = await VideoSegmentModel.markSegmentInProgress(
        leastAssignedSegment.segment_id
      );

      return res.status(201).json({
        message: "Segment assigné avec succès",
        segment: leastAssignedSegment,
        assignment: newAssignment,
      });
    }

    // Si aucun segment disponible, redistribuer équitablement
    console.log("Redistribution des segments requise");
    const totalUsers = new Set(allAssignments.map((a) => a.user_id)).size + 1;
    const redistributedSegments = [];

    allSegments.forEach((segment, index) => {
      const assignedUserId =
        allAssignments[index % totalUsers]?.user_id || user_id;
      redistributedSegments.push({
        segment_id: segment.segment_id,
        user_id: assignedUserId,
      });
    });

    // Appliquer la redistribution
    for (const { segment_id, user_id } of redistributedSegments) {
      await SegmentUserModel.insert({
        user_id,
        segment_id,
        assigned_at: new Date(),
      });
      await VideoSegmentModel.markSegmentInProgress(segment.segment_id);
    }
    // // Trouver un segment disponible
    // const availableSegment = await VideoSegmentModel.findAvailableSegment(
    //   session_id
    // );

    // if (availableSegment) {
    //   // Assigner le segment à l'utilisateur
    //   // const assignment = await SegmentUserModel.assignUserToSegment(
    //   //   user_id,
    //   //   availableSegment.segment_id
    //   // );
    //   // Assigner le segment à l'utilisateur
    //   const assignment = await SegmentUserModel.insert({
    //     user_id,
    //     segment_id: availableSegment.segment_id,
    //     assigned_at: new Date(),
    //   });
    //   await VideoSegmentModel.markSegmentInProgress(
    //     availableSegment.segment_id
    //   );

    //   return res.status(201).json({
    //     message: "Segment assigné avec succès",
    //     segment: availableSegment,
    //     assignment,
    //   });
    // }

    // Redistribuer les segments si aucun segment disponible

    // // Ajouter l'utilisateur à la liste et redistribuer
    // if (!segmentUsage[user_id]) {
    //   segmentUsage[user_id] = [];
    // }
    // les segments à redistribuer
    // const totalUsers = Object.keys(segmentUsage); // Inclure le nouvel utilisateur

    // const redistributedSegments = [];

    // allSegments.forEach((segment, index) => {
    //   const assignedUser = totalUsers[index % totalUsers.length];
    //   redistributedSegments.push({
    //     segment_id: segment.segment_id,
    //     user_id: assignedUser,
    //   });
    // });

    // // Appliquer la redistribution
    // for (const { segment_id, user_id } of redistributedSegments) {
    //   // await SegmentUserModel.assignUserToSegment(user_id, segment_id);
    //   await SegmentUserModel.insert({
    //     user_id,
    //     segment_id,
    //     assigned_at: new Date(),
    //   });
    //   await VideoSegmentModel.markSegmentInProgress(segment_id);
    // }

    return res.status(201).json({
      message: "Segments redistribués avec succès",
      redistributedSegments,
    });
  } catch (error) {
    console.error("Erreur lors de l'assignation des segments :", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

module.exports = { assignDynamicSegment };
