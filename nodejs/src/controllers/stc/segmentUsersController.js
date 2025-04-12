const SegmentUserModel = require("../../models/SegmentUserModel");
const VideoSegmentModel = require("../../models/VideoSegmentModel");
const SubtitleModel = require("../../models/SubtitleModel");
const { client: redisClient } = require("../../redis/index");
const levenshtein = require("fast-levenshtein"); // Librairie pour Levenshtein
const { adjustTextWithNeighbors } = require("../../utils/algo_textes");

const { predictNextWord, trigramModel } = require("../../utils/correction");

async function assignUserToSegmentController(req, res) {
  const { user_id, segment_id } = req.body;

  if (!user_id || !segment_id) {
    return res
      .status(400)
      .json({ message: "Les champs obligatoires sont manquants" });
  }

  try {
    // Récupérer tous les segments de la session
    const allSegments = await VideoSegmentModel.findManyBy({ session_id });

    // Récupérer tous les utilisateurs connectés à cette session
    const allUserAssignments = await SegmentUserModel.findManyBy({
      session_id,
    });

    // Grouper les segments par utilisateur
    const userSegmentMap = {};
    allUserAssignments.forEach((assignment) => {
      if (!userSegmentMap[assignment.user_id]) {
        userSegmentMap[assignment.user_id] = [];
      }
      userSegmentMap[assignment.user_id].push(assignment.segment_id);
    });

    // Vérifier si l'utilisateur a déjà un segment
    if (userSegmentMap[user_id]) {
      return res.status(200).json({
        message: "Utilisateur déjà assigné à des segments",
        assignedSegments: userSegmentMap[user_id],
      });
    }

    if (unassignedSegments.length > 0) {
      // Attribuer un segment libre à l'utilisateur
      const segmentToAssign = unassignedSegments[0];
      const newAssignment = await SegmentUserModel.insert({
        user_id,
        segment_id: segmentToAssign.segment_id,
        assigned_at: new Date(),
      });

      await VideoSegmentModel.updateOneById(segmentToAssign.segment_id, {
        status: "in_progress",
      });

      return res.status(201).json({
        message: "Segment libre assigné à l'utilisateur",
        assignedSegment: segmentToAssign,
        newAssignment,
      });
    }

    return res.status(200).json({
      message: "Aucun segment libre disponible",
    });
  } catch (error) {
    console.error("Erreur lors de l'assignation dynamique :", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

async function addSubtitle(req, res) {
  const { segment_id, text, created_by } = req.body;

  if (!segment_id || !text || !created_by) {
    return res.status(400).json({ message: "Champs obligatoires manquants." });
  }

  try {
    // ✅ Vérifier si le segment existe
    const currentSegment = await VideoSegmentModel.findById(segment_id);
    if (!currentSegment) {
      return res.status(404).json({ message: "Segment introuvable." });
    }

    // ✅ Vérifier si l'utilisateur est bien assigné à ce segment
    const isUserAssigned = await SegmentUserModel.isUserAssignedToSegment(
      created_by,
      segment_id
    );

    if (!isUserAssigned) {
      return res.status(403).json({
        message: "🚫 Vous n'êtes pas autorisé à sous-titrer ce segment.",
      });
    }

    console.log(
      `✏️ Ajout du sous-titre pour le segment ${segment_id} : "${text}"`
    );

    // // ✅ Utilisation de `predictNextWord()` pour compléter automatiquement le texte
    // const predictedWord = predictNextWord(text, trigramModel);
    // if (predictedWord) {
    //   text = `${text} ${predictedWord}`;
    //   console.log(`🔮 Correction automatique avec n-gram : "${text}"`);
    // }

    // ✅ Vérifier les chevauchements avec les segments voisins
    const adjustedText = await adjustTextWithNeighbors(currentSegment, text);
    console.log(
      `📌 Texte final pour le segment ${segment_id} : "${adjustedText}"`
    );

    // ✅ Ajouter le sous-titre en base de données
    const newSubtitle = await SubtitleModel.addSubtitle({
      segment_id,
      text: adjustedText,
      created_by,
    });

    return res.status(201).json({
      message: "✅ Sous-titre ajouté avec succès.",
      subtitle: newSubtitle,
    });
  } catch (error) {
    console.error("❌ Erreur lors de l’ajout du sous-titre :", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

// async function addSubtitle(req, res) {
//   const { segment_id, text, created_by } = req.body;

//   if (!segment_id || !text || !created_by) {
//     return res.status(400).json({ message: "Champs obligatoires manquants" });
//   }

//   try {
//     // Vérifier si le segment existe et est en cours (in_progress)
//     // const segment = await VideoSegmentModel.findById(segment_id);

//     // if (!segment || segment.status !== "in_progress") {
//     //   return res
//     //     .status(400)
//     //     .json({ message: "Segment invalide ou non assigné." });
//     // }

//     // // Ajouter le sous-titre
//     // const newSubtitle = await SubtitleModel.addSubtitle({
//     //   segment_id,
//     //   text,
//     //   created_by,
//     // });
//     // Validation : l'utilisateur est-il assigné à ce segment ?
//     const isUserAssigned = await SegmentUserModel.isUserAssignedToSegment(
//       created_by,
//       segment_id
//     );

//     if (!isUserAssigned) {
//       return res.status(403).json({
//         message: "Vous n'êtes pas autorisé à sous-titrer ce segment.",
//       });
//     }

//     // Étape 2 : Vérifier si un sous-titre similaire existe déjà dans Redis
//     const redisKey = `segment:${segment_id}:subtitles`;
//     const existingSubtitles = await redisClient.lRange(redisKey, 0, -1);
//     // Vérifier les doublons (optionnel selon les besoins)
//     if (existingSubtitles.some((sub) => JSON.parse(sub).text === text)) {
//       return res.status(400).json({
//         message: "Un sous-titre similaire existe déjà pour ce segment.",
//       });
//     }

//     // Étape 3 : Ajouter le sous-titre en base de données
//     const newSubtitle = await SubtitleModel.addSubtitle({
//       segment_id,
//       text,
//       created_by,
//     });

//     // Étape 4 : Mettre à jour le cache Redis
//     await redisClient.lPush(redisKey, JSON.stringify(newSubtitle));
//     await redisClient.expire(redisKey, 3600); // TTL : 1 heure, modifiable

//     return res.status(201).json({
//       message: "Sous-titre ajouté avec succès.",
//       subtitle: newSubtitle,
//     });
//   } catch (error) {
//     console.error("Erreur lors de l'ajout du sous-titre :", error);
//     return res.status(500).json({ message: "Erreur serveur" });
//   }
// }
// async function addSubtitle(req, res) {
//   const { segment_id, text, created_by } = req.body;

//   // Vérifier si l'utilisateur est assigné au segment
//   const isUserAssigned = await SegmentUserModel.isUserAssignedToSegment(
//     created_by,
//     segment_id
//   );
//   if (!isUserAssigned) {
//     return res
//       .status(403)
//       .json({ message: "Non autorisé à sous-titrer ce segment." });
//   }

//   // // Vérifier les doublons directement dans PostgreSQL
//   // const existingSubtitles = await SubtitleModel.getSubtitlesBySegment(
//   //   segment_id
//   // );
//   const isInternalDuplicate = await isDuplicateInSegment(segment_id, text);
//   const isNeighborDuplicate = await isDuplicateBetweenNeighbors(segment, text);

//   if (isInternalDuplicate || isNeighborDuplicate) {
//     return res.status(400).json({ message: "Sous-titre similaire détecté." });
//   }

//   // Ajouter directement le sous-titre dans PostgreSQL
//   try {
//     const newSubtitle = await SubtitleModel.addSubtitle({
//       segment_id,
//       text,
//       created_by,
//     });

//     // // Notifier les autres utilisateurs en temps réel
//     // io.to(`segment_${segment_id}`).emit("subtitle_added", newSubtitle);

//     return res.status(201).json({ message: "Sous-titre ajouté avec succès." });
//   } catch (error) {
//     console.error("Erreur lors de l'ajout du sous-titre :", error);
//     return res.status(500).json({ message: "Erreur serveur" });
//   }
// }

// async function addSubtitle(req, res) {
//   const { segment_id, text, created_by } = req.body;

//   if (!segment_id || !text || !created_by) {
//     return res.status(400).json({ message: "Champs obligatoires manquants." });
//   }

//   try {
//     // Vérifie si le segment existe
//     const currentSegment = await VideoSegmentModel.findById(segment_id);
//     if (!currentSegment) {
//       return res.status(404).json({ message: "Segment introuvable." });
//     }

//     // Vérifie les chevauchements avec les voisins
//     const adjustedText = await adjustTextWithNeighbors(currentSegment, text);

//     console.log(
//       `Texte après ajustement pour le segment ${segment_id} : "${adjustedText}"`
//     );

//     // Ajoute le sous-titre ajusté
//     const newSubtitle = await SubtitleModel.addSubtitle({
//       segment_id,
//       text: adjustedText,
//       created_by,
//     });

//     return res.status(201).json({
//       message: "Sous-titre ajouté avec succès.",
//       subtitle: newSubtitle,
//     });
//   } catch (error) {
//     console.error("Erreur lors de l'ajout du sous-titre :", error);
//     return res.status(500).json({ message: "Erreur serveur." });
//   }
// }
// async function addSubtitle(req, res) {
//   const { segment_id, text, created_by } = req.body;

//   if (!segment_id || !text || !created_by) {
//     return res.status(400).json({ message: "Champs obligatoires manquants." });
//   }

//   try {
//     // Vérifie si le segment existe
//     const currentSegment = await VideoSegmentModel.findById(segment_id);
//     if (!currentSegment) {
//       return res.status(404).json({ message: "Segment introuvable." });
//     }

//     // Vérifie les chevauchements avec les voisins
//     console.log(
//       `Ajustement pour le segment ${segment_id}. Texte initial : "${text}"`
//     );
//     const adjustedText = await adjustTextWithNeighbors(currentSegment, text);
//     console.log(
//       `Texte après ajustement pour le segment ${segment_id} : "${adjustedText}"`
//     );

//     // Ajoute le sous-titre ajusté
//     const newSubtitle = await SubtitleModel.addSubtitle({
//       segment_id,
//       text: adjustedText,
//       created_by,
//     });

//     return res.status(201).json({
//       message: "Sous-titre ajouté avec succès.",
//       subtitle: newSubtitle,
//     });
//   } catch (error) {
//     console.error("Erreur lors de l’ajout du sous-titre :", error);
//     return res.status(500).json({ message: "Erreur serveur." });
//   }
// }
async function getSubtitlesBySegment(req, res) {
  const { segment_id } = req.params;

  if (!segment_id) {
    return res.status(400).json({ message: "Le segment_id est requis." });
  }

  try {
    // Récupérer directement les sous-titres depuis la base de données
    const subtitles = await SubtitleModel.getSubtitlesBySegment(segment_id);
    return res.status(200).json({
      message: "Sous-titres récupérés avec succès.",
      subtitles,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des sous-titres :", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

module.exports = {
  assignUserToSegmentController,
  addSubtitle,
  getSubtitlesBySegment,
};
