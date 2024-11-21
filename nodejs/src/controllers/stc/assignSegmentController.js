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
    // Étape 1 : Récupérer tous les segments pour la session
    const allSegments = await VideoSegmentModel.findManyBy({ session_id });
    console.log("Segments disponibles pour la session :", allSegments);

    // 2. Récupérer toutes les assignations existantes pour la session
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

    // Étape 3 : Créer une carte des utilisateurs par segment
    const segmentUsage = {}; // Compteur d'utilisateurs par segment

    allAssignments.forEach((assignment) => {
      if (!segmentUsage[assignment.segment_id]) {
        segmentUsage[assignment.segment_id] = new Set();
      }
      segmentUsage[assignment.segment_id].add(assignment.user_id);
    });

    // Étape 4 : Vérifier si l'utilisateur est déjà assigné à des segments
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
      // const count = segmentUsage[segment.segment_id] || 0;
      // if (count < minUsers) {
      //   minUsers = count;
      //   leastAssignedSegment = segment;
      const usersOnSegment = segmentUsage[segment.segment_id] || new Set();
      if (usersOnSegment.size < minUsers && !usersOnSegment.has(user_id)) {
        minUsers = usersOnSegment.size;
        leastAssignedSegment = segment;
      }
    }

    // Si un segment est disponible, l'assigner
    // if (leastAssignedSegment) {
    //   // Ajouter l'utilisateur au segment avec le moins d'utilisateurs
    //   const newAssignment = await SegmentUserModel.insert({
    //     user_id,
    //     segment_id: leastAssignedSegment.segment_id,
    //     assigned_at: new Date(),
    //   });
    // if (
    //   leastAssignedSegment &&
    // !segmentUsage[leastAssignedSegment.segment_id]?.has(user_id)
    // ) {
    //   const newAssignment = await SegmentUserModel.assignUserToSegment(
    //     user_id,
    //     leastAssignedSegment.segment_id
    //   );
    if (leastAssignedSegment) {
      const newAssignment = await SegmentUserModel.assignUserToSegment(
        user_id,
        leastAssignedSegment.segment_id
      );
      await VideoSegmentModel.markSegmentInProgress(
        leastAssignedSegment.segment_id
      );
      // Mettre à jour le statut du segment en "in_progress"
      await VideoSegmentModel.markSegmentInProgress(
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
    // const totalUsers = new Set(allAssignments.map((a) => a.user_id)).size + 1;
    // Étape 5 : Redistribuer équitablement les segments entre les utilisateurs connectés
    const totalUsers = [...new Set(allAssignments.map((a) => a.user_id))];
    if (!totalUsers.includes(user_id)) {
      totalUsers.push(user_id);
    }

    // // Trier les segments pour éviter les assignations consécutives
    // const sortedSegments = allSegments.sort(
    //   (a, b) => a.segment_id - b.segment_id
    // );

    const redistributedSegments = [];
    let userIndex = 0;
    // allSegments.forEach((segment) => {
    //   // Exclure les segments déjà attribués à l'utilisateur courant
    //   if (!segmentUsage[segment.segment_id]?.has(user_id)) {
    //     const assignedUserId =
    //       [...totalUsers][
    //         Array.from(totalUsers).indexOf(segment.segment_id) % totalUsers.size
    //       ] || user_id;

    //     redistributedSegments.push({
    //       segment_id: segment.segment_id,
    //       user_id: assignedUserId,
    //     });
    //   }
    // });

    // Appliquer la redistribution
    // for (const { segment_id, user_id } of redistributedSegments) {
    //   await SegmentUserModel.insert({
    //     user_id,
    //     segment_id,
    //     assigned_at: new Date(),
    //   });
    //   await VideoSegmentModel.markSegmentInProgress(segment_id);
    // }
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
    // for (const segment of allSegments) {
    //   const currentUsers = segmentUsage[segment.segment_id] || new Set();

    //   // Redistribuer uniquement si le segment n'est pas partagé avec l'utilisateur
    //   if (!currentUsers.has(user_id)) {
    //     const nextUserIndex =
    //       (totalUsers.indexOf([...currentUsers][0]) + 1) % totalUsers.length;
    //     const assignedUserId = totalUsers[nextUserIndex];

    //     if (!segmentUsage[segment.segment_id]?.has(assignedUserId)) {
    //       await SegmentUserModel.assignUserToSegment(
    //         assignedUserId,
    //         segment.segment_id
    //       );
    //       await VideoSegmentModel.markSegmentInProgress(segment.segment_id);

    //       redistributedSegments.push({
    //         segment_id: segment.segment_id,
    //         user_id: assignedUserId,
    //       });

    //       // Mettre à jour la carte des utilisateurs
    //       if (!segmentUsage[segment.segment_id]) {
    //         segmentUsage[segment.segment_id] = new Set();
    //       }
    //       segmentUsage[segment.segment_id].add(assignedUserId);
    //     }
    //   }
    // }
    // for (let i = 0; i < sortedSegments.length; i++) {
    //   const segment = allSegments[i];
    //   const currentUsers = segmentUsage[segment.segment_id] || new Set();

    //   if (!currentUsers.has(totalUsers[userIndex])) {
    //     await SegmentUserModel.assignUserToSegment(
    //       totalUsers[userIndex],
    //       segment.segment_id
    //     );
    //     await VideoSegmentModel.markSegmentInProgress(segment.segment_id);

    //     redistributedSegments.push({
    //       segment_id: segment.segment_id,
    //       user_id: totalUsers[userIndex],
    //     });

    //     // Alterner entre les utilisateurs connectés
    //     userIndex = (userIndex + 1) % totalUsers.length;
    //   }
    // }
    for (let i = 0; i < allSegments.length; i++) {
      const segment = allSegments[i];
      const usersOnSegment = segmentUsage[segment.segment_id] || new Set();
      // S'assurer que l'utilisateur courant ne reçoit pas de segments consécutifs
      if (usersOnSegment.size < totalUsers.length) {
        const assignedUserId =
          totalUsers[((i % totalUsers.length) + 1) % totalUsers.length];

        if (!segmentUsage[segment.segment_id]?.has(assignedUserId)) {
          await SegmentUserModel.assignUserToSegment(
            assignedUserId,
            segment.segment_id
          );
          await VideoSegmentModel.markSegmentInProgress(segment.segment_id);

          redistributedSegments.push({
            segment_id: segment.segment_id,
            user_id: assignedUserId,
          });

          if (!segmentUsage[segment.segment_id]) {
            segmentUsage[segment.segment_id] = new Set();
          }
          segmentUsage[segment.segment_id].add(assignedUserId);
        }
      }
    }
    return res.status(201).json({
      message: "Segments redistribués avec succès",
      redistributedSegments,
    });
  } catch (error) {
    console.error("Erreur lors de l'assignation des segments :", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

async function handleUserDisconnection(req, res) {
  const { user_id, session_id } = req.body;

  if (!user_id || !session_id) {
    return res
      .status(400)
      .json({ message: "Les champs obligatoires sont manquants" });
  }

  try {
    // 1. Trouver les segments de l'utilisateur
    const userSegments = await SegmentUserModel.findAssignmentsBySession(
      session_id
    );
    console.log("Segments de l'utilisateur déconnecté :", userSegments);

    // const segmentsToRedistribute = userSegments.filter(
    //   (segment) => segment.user_id === user_id
    // );
    // console.log("Segments à redistribuer :", segmentsToRedistribute);

    // 2. Supprimer les assignations de cet utilisateur
    await SegmentUserModel.deleteAssignmentsByUser(user_id);

    // // 3. Obtenir tous les utilisateurs encore connectés pour cette session
    // const totalUsers = await SegmentUserModel.findtotalUsers(session_id);
    // console.log("Utilisateurs connectés restants :", totalUsers);

    // if (totalUsers.length === 0) {
    //   // Aucun utilisateur connecté : remettre les segments en "available"
    //   for (const segment of segmentsToRedistribute) {
    //     await VideoSegmentModel.updateOneById(segment.segment_id, {
    //       status: "available",
    //     });
    //   }
    //   return res.status(200).json({
    //     message: "Aucun utilisateur connecté pour redistribuer les segments.",
    //   });
    // }

    // // 4. Construire une carte des assignations existantes
    // const userSegmentMap = {};
    // totalUsers.forEach((user) => {
    //   userSegmentMap[user.user_id] = [];
    // });

    // // 4. Redistribuer les segments de l'utilisateur déconnecté
    // // const redistributedSegments = [];
    // // for (const segment of userSegments) {
    // //   // Trouver l'utilisateur suivant à qui attribuer ce segment
    // //   const userToAssign =
    // //     totalUsers[userSegments.indexOf(segment) % totalUsers.length];
    // //   // Assigner le segment à l'utilisateur choisi
    // //   if (totalUsers.length > 0) {
    // //     await SegmentUserModel.assignUserToSegment(
    // //       userToAssign.user_id,
    // //       segment.segment_id
    // //     );
    // //     // Mettre à jour le statut du segment en "in_progress"
    // //     await VideoSegmentModel.markSegmentInProgress(segment.segment_id);
    // //   } else {
    // //     // Si aucun utilisateur connecté, remettre le segment à "available"
    // //     await VideoSegmentModel.updateOneById(segment.segment_id, {
    // //       status: "available",
    // //     });
    // //   }
    // //   // Stocker les détails de la redistribution pour le suivi
    // //   redistributedSegments.push({
    // //     segment_id: segment.segment_id,
    // //     user_id: userToAssign.user_id,
    // //   });
    // // }
    // segmentsToRedistribute.forEach((segment, index) => {
    //   const assignedUser = totalUsers[index % totalUsers.length];
    //   userSegmentMap[assignedUser.user_id].push(segment.segment_id);
    // });

    // // 5. Redistribuer les segments
    // for (const [userId, segments] of Object.entries(userSegmentMap)) {
    //   for (const segmentId of segments) {
    //     await SegmentUserModel.assignUserToSegment(userId, segmentId);
    //     await VideoSegmentModel.markSegmentInProgress(segmentId);
    //   }
    // }

    // 3. Parcourir les segments pour vérifier les utilisateurs assignés
    for (const segment of userSegments) {
      const otherAssignments = await SegmentUserModel.findAssignmentsBySegment(
        segment.segment_id
      );

      if (otherAssignments.length > 0) {
        // Si un autre utilisateur est déjà assigné à ce segment, ne rien faire
        console.log(
          `Segment ${segment.segment_id} déjà partagé avec d'autres utilisateurs. Pas de redistribution.`
        );
        continue;
      }

      // 4. Obtenir les utilisateurs connectés restants pour cette session
      const totalUsers = await SegmentUserModel.findConnectedUsers(session_id);

      if (totalUsers.length > 0) {
        // Redistribuer le segment à un utilisateur connecté
        const userToAssign =
          totalUsers[Math.floor(Math.random() * totalUsers.length)];
        await SegmentUserModel.assignUserToSegment(
          userToAssign.user_id,
          segment.segment_id
        );
        await VideoSegmentModel.markSegmentInProgress(segment.segment_id);
        console.log(
          `Segment ${segment.segment_id} redistribué à l'utilisateur ${userToAssign.user_id}.`
        );
      } else {
        // Si aucun utilisateur connecté, remettre le segment à "available"
        await VideoSegmentModel.updateOneById(segment.segment_id, {
          status: "available",
        });
        console.log(`Segment ${segment.segment_id} marqué comme disponible.`);
      }
    }
    return res
      .status(200)
      .json({ message: "Segments vérifiés et redistribués si nécessaire." });
  } catch (error) {
    console.error("Erreur lors de la gestion de la déconnexion :", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

module.exports = { assignDynamicSegment, handleUserDisconnection };
