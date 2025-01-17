const SegmentUserModel = require("../../models/SegmentUserModel");
const VideoSegmentModel = require("../../models/VideoSegmentModel");
const SubtitleModel = require("../../models/SubtitleModel");
const { client: redisClient } = require("../../redis/index");
//const { validateWord, getSuggestion } = require("../../utils/dictionaryLoader");
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
async function addSubtitle(req, res) {
  const { segment_id, text, created_by, start_time, end_time } = req.body;
  const redisKey = `segment:${segment_id}:subtitles`;

  console.log("addSubtitle appelé avec les données :", { segment_id, text, created_by, start_time, end_time });

  try {
    // Étape 1 : Vérifier si l'utilisateur est assigné au segment
    const isUserAssigned = await SegmentUserModel.isUserAssignedToSegment(created_by, segment_id);
    if (!isUserAssigned) {
      return res.status(403).json({ message: "Non autorisé à sous-titrer ce segment." });
    }

    // Étape 2 :Vérifier les doublons dans Redis
 const existingSubtitles = await redisClient.lRange(redisKey, 0, -1);
 const isDuplicateInRedis = existingSubtitles.some(
  (sub) => JSON.parse(sub).text === text
);

 if (isDuplicateInRedis) {
  console.log(
    `Sous-titre "${text}" trouvé dans Redis pour le segment ${segment_id}. Vérification PostgreSQL...`
  );

  // Vérifier si le sous-titre est réellement dans PostgreSQL
  const subtitlesInDB = await SubtitleModel.getSubtitlesBySegment(segment_id);
  const isDuplicateInDB = subtitlesInDB.some(
    (sub) => sub.text === text && sub.start_time === start_time
  );

  if (isDuplicateInDB) {
    return res.status(400).json({ message: "Sous-titre similaire existant." });
  } else {
    // Si le sous-titre n'est pas dans PostgreSQL, le supprimer de Redis
    console.log(
      `Conflit détecté : suppression du sous-titre "${text}" de Redis pour le segment ${segment_id}.`
    );
    await redisClient.lRem(redisKey, 1, JSON.stringify({ text, created_by }));
  }
}


    // Étape 3 : Ajouter le sous-titre dans Redis
    await redisClient.lPush(redisKey, JSON.stringify({ text, created_by, start_time, end_time }));
    redisClient.expire(redisKey, 3600); // Expiration après 1 heure

    console.log(`Sous-titre ajouté dans Redis pour le segment ${segment_id}.`);

    // Étape 4 : Mettre à jour le statut du segment à "in_progress"
    try {
      await VideoSegmentModel.markSegmentInProgress(segment_id);
      console.log(`Segment ${segment_id} marqué comme 'in_progress' après ajout du sous-titre.`);
    } catch (error) {
      console.error(
        `Erreur lors de la mise à jour du statut du segment ${segment_id} à 'in_progress' :`,
        error
      );
      return res.status(500).json({ message: "Erreur lors de la mise à jour du segment." });
    }

    // Étape 5 : Ajouter le sous-titre dans PostgreSQL
    try {
      const newSubtitle = await SubtitleModel.addSubtitle({
        segment_id,
        text,
        created_by,
        start_time,
        end_time,
      });

      console.log("Sous-titre ajouté à PostgreSQL :", newSubtitle);

      return res.status(201).json({
        message: "Sous-titre ajouté avec succès.",
        subtitle: newSubtitle,
      });
    } catch (error) {
      console.error("Erreur lors de l'ajout du sous-titre dans PostgreSQL :", error);
      return res.status(500).json({ message: "Erreur serveur lors de l'enregistrement en base de données." });
    }
  } catch (error) {
    console.error("Erreur lors de l'ajout du sous-titre :", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

async function getSubtitlesBySegment(req, res) {
  const { segment_id } = req.params;

  if (!segment_id) {
    return res.status(400).json({ message: "Le segment_id est requis." });
  }

  try {
    const redisKey = `segment:${segment_id}:subtitles`;
    // Vérifier si les sous-titres sont en cache
    const cachedSubtitles = await redisClient.lRange(redisKey, 0, -1);

    if (cachedSubtitles && cachedSubtitles.length > 0) {
      return res.status(200).json({
        message: "Sous-titres récupérés avec succès (cache).",
        subtitles: cachedSubtitles.map((subtitle) => JSON.parse(subtitle)),
      });
    }

    // Si non en cache, récupérer depuis PostgreSQL
    const subtitles = await SubtitleModel.getSubtitlesBySegment(segment_id);

    // Stocker les sous-titres dans Redis pour les futures requêtes
    if (subtitles && subtitles.length > 0) {
      await redisClient.del(redisKey); // Supprimer les anciennes données
      const pipeline = redisClient.pipeline();
      subtitles.forEach((subtitle) =>
        pipeline.rPush(redisKey, JSON.stringify(subtitle))
      );
      pipeline.expire(redisKey, 3600); // TTL de 1 heure
      await pipeline.exec();
    }

    return res.status(200).json({
      message: "Sous-titres récupérés avec succès.",
      subtitles,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des sous-titres :", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
}
async function getSubtitlesBySession(req, res) {
  const { session_id } = req.params;

  if (!session_id) {
    return res.status(400).json({ message: "Session ID est requis." });
  }

  try {
    const subtitles = await SubtitleModel.getSubtitlesBySession(session_id);
    return res.status(200).json({
      message: "Sous-titres récupérés avec succès.",
      subtitles,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des sous-titres :", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

//async function validateSubtitleWords(req, res) {
 // const { text } = req.body;

  //if (!text) {
  //  return res.status(400).json({ message: "Le texte est requis." });
  //}

  //try {
    // Diviser le texte en mots en supprimant les caractères indésirables
    //const words = text
      //.replace(/[^\w\sÀ-ÖØ-öø-ÿ']/g, "") // Supprimer les caractères non alphabétiques
      //.split(/\s+/); // Diviser par les espaces

    //const validationResults = words.map((word) => {
      //const result = validateWord(word); // Vérifier si le mot est valide dans le dictionnaire

      //if (!result.valid) {
        //return {
          //word: word,
          //valid: false,
          //suggestion: getSuggestion(word), // Obtenir une suggestion si disponible
        //};
      //}
      //return { word: word, valid: true }; // Le mot est valide
    //});

    // Filtrer les mots invalides pour les afficher séparément
    //const invalidWords = validationResults.filter((result) => !result.valid);

    //return res.status(200).json({
      //message: "Validation des sous-titres terminée.",
      //validationResults,
      //invalidWords,
    //});
  //} catch (error) {
    //console.error("Erreur lors de la validation des sous-titres :", error);
    //return res.status(500).json({ message: "Erreur serveur." });
  //}
//}



module.exports = {
  assignUserToSegmentController,
  addSubtitle,
  getSubtitlesBySegment,
  getSubtitlesBySession,
  //validateSubtitleWords,
};
