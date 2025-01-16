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
const { getConnectedUsers } = require("../../utils/socketUtils");

// async function assignDynamicSegment(req, res) {
//   const { user_id, session_id } = req.body;

//   if (!user_id || !session_id) {
//     return res
//       .status(400)
//       .json({ message: "Les champs obligatoires sont manquants" });
//   }

//   try {
//     // Étape 1 : Récupérer tous les segments pour la session
//     const allSegments = await VideoSegmentModel.findManyBy({ session_id });
//     console.log("Segments disponibles pour la session :", allSegments);

//     // Récupérer toutes les assignations existantes pour la session
//     const allAssignments = await SegmentUserModel.findAssignmentsBySession(
//       session_id
//     );
//     console.log("Assignations existantes :", allAssignments);

//     // Étape 3 : Créer une carte des utilisateurs par segment
//     const segmentUsage = {}; // Compteur d'utilisateurs par segment

//     allAssignments.forEach((assignment) => {
//       if (!segmentUsage[assignment.segment_id]) {
//         segmentUsage[assignment.segment_id] = new Set();
//       }
//       segmentUsage[assignment.segment_id].add(assignment.user_id);
//     });

//     // Étape 4 : Vérifier si l'utilisateur est déjà assigné à des segments
//     const userAssignments = allAssignments.filter(
//       (assignment) => assignment.user_id === user_id
//     );

//     if (userAssignments.length > 0) {
//       return res.status(200).json({
//         message: "Utilisateur déjà assigné à un ou plusieurs segments",
//         assignedSegments: userAssignments,
//       });
//     }
//     // Trouver le segment avec le moins d'utilisateurs
//     let leastAssignedSegment = null;
//     let minUsers = Infinity;
//     for (const segment of allSegments) {
//       const usersOnSegment = segmentUsage[segment.segment_id] || new Set();
//       if (usersOnSegment.size < minUsers && !usersOnSegment.has(user_id)) {
//         minUsers = usersOnSegment.size;
//         leastAssignedSegment = segment;
//       }
//     }

//     if (leastAssignedSegment) {
//       const newAssignment = await SegmentUserModel.assignUserToSegment(
//         user_id,
//         leastAssignedSegment.segment_id
//       );
//       await VideoSegmentModel.markSegmentInProgress(
//         leastAssignedSegment.segment_id
//       );
//       // Mettre à jour le statut du segment en "in_progress"
//       await VideoSegmentModel.markSegmentInProgress(
//         leastAssignedSegment.segment_id
//       );

//       return res.status(201).json({
//         message: "Segment assigné avec succès",
//         segment: leastAssignedSegment,
//         assignment: newAssignment,
//       });
//     }

//     // Si aucun segment disponible, redistribuer équitablement
//     console.log("Redistribution des segments requise");
//     // const totalUsers = new Set(allAssignments.map((a) => a.user_id)).size + 1;
//     // Étape 5 : Redistribuer équitablement les segments entre les utilisateurs connectés
//     const totalUsers = [...new Set(allAssignments.map((a) => a.user_id))];
//     if (!totalUsers.includes(user_id)) {
//       totalUsers.push(user_id);
//     }

//     const redistributedSegments = [];
//     let userIndex = 0;

//     for (let i = 0; i < allSegments.length; i++) {
//       const segment = allSegments[i];
//       const usersOnSegment = segmentUsage[segment.segment_id] || new Set();
//       // S'assurer que l'utilisateur courant ne reçoit pas de segments consécutifs
//       if (usersOnSegment.size < totalUsers.length) {
//         const assignedUserId =
//           totalUsers[((i % totalUsers.length) + 1) % totalUsers.length];

//         if (!segmentUsage[segment.segment_id]?.has(assignedUserId)) {
//           await SegmentUserModel.assignUserToSegment(
//             assignedUserId,
//             segment.segment_id
//           );
//           await VideoSegmentModel.markSegmentInProgress(segment.segment_id);

//           redistributedSegments.push({
//             segment_id: segment.segment_id,
//             user_id: assignedUserId,
//           });

//           if (!segmentUsage[segment.segment_id]) {
//             segmentUsage[segment.segment_id] = new Set();
//           }
//           segmentUsage[segment.segment_id].add(assignedUserId);
//         }
//       }
//     }
//     return res.status(201).json({
//       message: "Segments redistribués avec succès",
//       redistributedSegments,
//     });
//   } catch (error) {
//     console.error("Erreur lors de l'assignation des segments :", error);
//     return res.status(500).json({ message: "Erreur serveur" });
//   }
// }
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
    const connectedUsers = await getConnectedUsers(session_id);

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

// async function assignSegmentsToUsers(session_id, createdSegments) {
//   try {
//     // Étape 1 : Récupérer tous les utilisateurs connectés à la session
//     const usersInSession = await SegmentUserModel.findUsersBySessionId(
//       session_id
//     );

//     if (!usersInSession || usersInSession.length < 2) {
//       throw new Error(
//         "Moins de deux utilisateurs connectés pour cette session."
//       );
//     }

//     // Étape 2 : Préparer la logique d'assignation
//     const assignments = [];
//     const totalUsers = usersInSession.length;

//     createdSegments.forEach((segment, index) => {
//       const userId = usersInSession[index % totalUsers].user_id; // Assignation cyclique
//       assignments.push({
//         user_id: userId,
//         segment_id: segment.segment_id,
//         assigned_at: new Date(),
//       });
//     });

//     // Étape 3 : Insérer les assignations dans la base de données
//     await Promise.all(
//       assignments.map((assignment) =>
//         SegmentUserModel.assignUserToSegment(
//           assignment.user_id,
//           assignment.segment_id
//         )
//       )
//     );

//     // Mettre à jour les segments en tant que "in_progress"
//     await Promise.all(
//       assignments.map((assignment) =>
//         VideoSegmentModel.markSegmentInProgress(assignment.segment_id)
//       )
//     );

//     return assignments;
//   } catch (error) {
//     console.error("Erreur lors de l'assignation des segments :", error);
//     throw error;
//   }
// }

// async function assignSegmentsToUsers(session_id, createdSegments) {
//   try {
//     // Étape 1 : Récupérer les utilisateurs connectés via Socket.IO
//     const usersInSession = await getConnectedUsers(session_id);

//     if (!usersInSession || usersInSession.length === 0) {
//       throw new Error("Aucun utilisateur connecté pour cette session.");
//     }

//     // console.log("Utilisateurs connectés :", usersInSession);

//     // Étape 2 : Préparer l'assignation des segments
//     const assignments = [];
//     const totalUsers = usersInSession.length;

//     createdSegments.forEach((segment, index) => {
//       const userId = usersInSession[index % totalUsers].user_id; // Assignation cyclique
//       assignments.push({
//         user_id: userId,
//         segment_id: segment.segment_id,
//         assigned_at: new Date(),
//       });
//     });

//     // Étape 3 : Insérer les assignations dans la base de données
//     await Promise.all(
//       assignments.map((assignment) =>
//         SegmentUserModel.assignUserToSegment(
//           assignment.user_id,
//           assignment.segment_id
//         )
//       )
//     );

//     console.log("Assignations terminées :", assignments);
//     return assignments;
//   } catch (error) {
//     console.error("Erreur lors de l'assignation des segments :", error);
//     throw error;
//   }
// }
// async function assignSegmentsToUsers(session_id, createdSegments) {
//   try {
//     // Étape 1 : Récupérer les utilisateurs connectés via Socket.IO
//     const usersInSession = await getConnectedUsers(session_id);

//     if (!usersInSession || usersInSession.length === 0) {
//       await Promise.all(
//         createdSegments.map((segment) =>
//           VideoSegmentModel.updateOneById(segment.segment_id, {
//             status: "available",
//           })
//         )
//       );
//       throw new Error("Aucun utilisateur connecté pour cette session.");
//     }

//     console.log("Utilisateurs connectés :", usersInSession);

//     // Étape 2 : Assigner les segments de manière cyclique
//     const assignments = [];
//     const totalUsers = usersInSession.length;

//     createdSegments.forEach((segment, index) => {
//       if (!segment.segment_id) {
//         throw new Error(`Segment invalide : ${JSON.stringify(segment)}`);
//       }
//       const userId = usersInSession[index % totalUsers].user_id; // Répartition équitable
//       assignments.push({
//         user_id: userId,
//         segment_id: segment.segment_id,
//         assigned_at: new Date(),
//       });
//     });

//     console.log("Assignations générées :", assignments);

//     // Étape 3 : Enregistrer les assignations dans la base de données
//     await Promise.all(
//       assignments.map(async (assignment) => {
//         console.log(`Tentative d'assignation : ${JSON.stringify(assignment)}`);
//         await SegmentUserModel.assignUserToSegment(
//           assignment.user_id,
//           assignment.segment_id
//         );

//         // Mettre à jour le statut du segment
//         await VideoSegmentModel.updateOneById(assignment.segment_id, {
//           status: "in_progress",
//         });

//         console.log(
//           `Mise à jour du statut pour le segment ${assignment.segment_id} : "in_progress"`
//         );
//       })
//     );

//     return assignments;
//   } catch (error) {
//     console.error("Erreur lors de l'assignation des segments :", error);
//     throw error;
//   }
// }

async function assignSegmentsToUsers(session_id, createdSegments) {
  try {
    // Étape 1 : Récupérer les utilisateurs connectés via Socket.IO
    const usersInSession = await getConnectedUsers(session_id);

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

// async function redistributeSegments(session_id) {
//   // 1. Obtenir la liste des utilisateurs connectés
//   const usersInSession = await getConnectedUsers(session_id);
//   if (!usersInSession || usersInSession.length === 0) {
//     throw new Error("Aucun utilisateur connecté pour cette session.");
//   }

//   // 2. Récupérer tous les segments déjà assignés
//   const assignedSegments = await VideoSegmentModel.getSegmentsByStatus(
//     session_id,
//     "assigned"
//   );

//   if (!assignedSegments || assignedSegments.length === 0) {
//     // Pas de segments à réattribuer, on arrête là
//     return [];
//   }

//   // 3. Supprimer les anciennes attributions pour ces segments
//   await SegmentUserModel.removeAssignmentsForSegments(
//     assignedSegments.map((seg) => seg.segment_id)
//   );

//   // 4. Répartir ces segments de façon cyclique
//   const assignments = [];
//   const totalUsers = usersInSession.length;

//   assignedSegments.forEach((segment, index) => {
//     const userId = usersInSession[index % totalUsers].user_id;
//     assignments.push({
//       user_id: userId,
//       segment_id: segment.segment_id,
//       assigned_at: new Date(),
//     });
//   });

//   // 5. Enregistrer les nouvelles attributions
//   await Promise.all(
//     assignments.map(async (assignment) => {
//       await SegmentUserModel.assignUserToSegment(
//         assignment.user_id,
//         assignment.segment_id
//       );
//       await VideoSegmentModel.markSegmentAssigned(assignment.segment_id);
//     })
//   );

//   return assignments;
// }

// async function redistributeSegments(session_id) {
//   try {
//     // Étape 1 : Récupérer les utilisateurs connectés
//     const usersInSession = await getConnectedUsers(session_id);

//     if (!usersInSession || usersInSession.length === 0) {
//       throw new Error("Aucun utilisateur connecté pour cette session.");
//     }

//     console.log("Redistribution : utilisateurs connectés :", usersInSession);

//     // Étape 2 : Récupérer tous les segments assignés ou disponibles
//     const existingSegments = await VideoSegmentModel.findManyBy({ session_id });

//     if (!existingSegments || existingSegments.length === 0) {
//       console.log("Aucun segment à redistribuer.");
//       return [];
//     }

//     const assignments = [];
//     const totalUsers = usersInSession.length;

//     // Étape 3 : Redistribuer les segments de manière équitable
//     existingSegments.forEach((segment, index) => {
//       const userId = usersInSession[index % totalUsers].user_id;
//       assignments.push({
//         user_id: userId,
//         segment_id: segment.segment_id,
//         assigned_at: new Date(),
//       });
//     });

//     console.log("Redistribution des segments :", assignments);

//     // Étape 4 : Mettre à jour les assignations et les statuts
//     await Promise.all(
//       assignments.map(async (assignment) => {
//         await SegmentUserModel.assignUserToSegment(
//           assignment.user_id,
//           assignment.segment_id
//         );
//         await VideoSegmentModel.updateSegmentStatus(
//           assignment.segment_id,
//           "assigned"
//         );
//       })
//     );

//     return assignments;
//   } catch (error) {
//     console.error("Erreur lors de la redistribution des segments :", error);
//     throw error;
//   }
// }

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
