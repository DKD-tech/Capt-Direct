const SegmentUserModel = require("../../models/SegmentUserModel");
const VideoSegmentModel = require("../../models/VideoSegmentModel");
const SubtitleModel = require("../../models/SubtitleModel");
const { client: redisClient } = require("../../redis/index");
const { isWordValid, suggestCorrection,cleanWord } = require("../../utils/dictionaryLoader");
const { adjustTextWithNeighbors, handleOverlapWithWords } = require("../../utils/adjust_text");

let fullTranscript = ""; 
const pool = require("../../config/db"); // Import de la connexion PostgreSQL


// Assure-toi que le chemin est correct

const levenshtein = require("fast-levenshtein"); // Librairie pour Levenshtein
//const { validateWord, getSuggestion } = require("../../utils/dictionaryLoader");


function setSocketInstance(socketInstance) {
  io = socketInstance;
}


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
/**
 * Ajouter un mot au sous-titre (en temps réel)
 */
async function addSubtitle(req, res) {
  console.log("🛠️ [BACKEND] Requête reçue pour ajouter un sous-titre :", req.body);
  try {
    const { segment_id, text, created_by } = req.body;

    console.log("📥 Requête reçue pour ajouter un sous-titre :", { segment_id, text, created_by });

    if (!segment_id || !text || !created_by) {
      return res.status(400).json({ message: "Champs obligatoires manquants." });
    }

    // Vérification du segment
    const segment = await VideoSegmentModel.findById(segment_id);
    if (!segment || segment.is_finalized) {
      return res.status(403).json({ message: "Le segment est finalisé ou inexistant." });
    }

    // Vérification si l'utilisateur est autorisé à sous-titrer ce segment
    const isUserAssigned = await SegmentUserModel.isUserAssignedToSegment(created_by, segment_id);
    if (!isUserAssigned) {
      return res.status(403).json({ message: "Non autorisé à sous-titrer ce segment." });
    }

    // Nettoyage et validation du texte
    let cleanedText = cleanWord(text.trim());
    // Vérification et correction via le dictionnaire
    if (!isWordValid(cleanedText)) {
      const suggestion = suggestCorrection(cleanedText);
      cleanedText = suggestion ? suggestion : cleanedText;  // ✅ Si invalide, on garde le texte original
  }
    // Vérification du chevauchement avec le dernier mot du segment précédent
    const lastWordKey = `segment:last_word:${segment.session_id}`;
    const lastWord = await redisClient.get(lastWordKey);

    if (lastWord && cleanedText) {
      const { adjustedText1, adjustedText2, overlap } = handleOverlapWithWords(lastWord, cleanedText);
      if (overlap) {
        console.warn(`🚨 Chevauchement détecté entre "${lastWord}" et "${cleanedText}"`);
        cleanedText = adjustedText2.trim();
        if (!cleanedText) {
          return res.status(400).json({ message: "Texte supprimé après ajustement du chevauchement." });
        }
      }
    }

    // Stockage du texte dans Redis
    const redisKey = `segment:${segment_id}:subtitles`;
    await redisClient.rPush(redisKey, cleanedText);

    console.log(`✅ Texte ajouté dans Redis pour le segment ${segment_id} : "${cleanedText}"`);

    return res.status(201).json({ message: "Texte ajouté au segment.", text: cleanedText });
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout du sous-titre :", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

/**
 * Finaliser le sous-titre après validation de tous les mots
 */
async function finalizeSubtitle(req, res) {
  console.log("🛠️ [BACKEND] Requête reçue pour finaliser un sous-titre :", req.body);

  const { segment_id, created_by } = req.body;

  if (!segment_id || !created_by) {
      console.log("❌ Requête invalide : segment_id ou created_by manquant.");
      return res.status(400).json({ message: "Champs obligatoires manquants." });
  }

  try {
      console.log(`📌 Vérification des sous-titres en attente pour segment ${segment_id}`);
      const redisKey = `segment:${segment_id}:subtitles`;
      let words = await redisClient.lRange(redisKey, 0, -1);

      console.log(`🔍 Contenu dans Redis pour ${redisKey} :`, words);

      if (!words || words.length === 0) {
          console.warn(`⚠️ Aucun sous-titre trouvé dans Redis pour ${segment_id}.`);
          return res.status(400).json({ message: "Aucun sous-titre à finaliser." });
      }

      let finalText = words.join(" ");
      console.log(`📌 Texte finalisé pour segment ${segment_id} :`, finalText);

      // Vérification du segment
      const segment = await VideoSegmentModel.findById(segment_id);
      if (!segment) {
          console.log("❌ Segment introuvable.");
          return res.status(404).json({ message: "Segment introuvable." });
      }

      // Ajustement avec les segments voisins
      finalText = await adjustTextWithNeighbors(segment, finalText);

      // Enregistrement en base de données
      await SubtitleModel.storeFinalSubtitle(segment_id, finalText, created_by);

      // Mise à jour du segment comme finalisé
      await VideoSegmentModel.finalizeSegment(segment_id);
      console.log(`✅ Segment ${segment_id} finalisé avec succès.`);

// Stockage du dernier mot pour gestion des chevauchements
const lastWords = finalText.trim().split(" ");
const lastWord = lastWords.length > 0 ? lastWords[lastWords.length - 1] : "";

// Stocker le dernier mot en Redis pour le segment finalisé
if (lastWord) {
  await redisClient.set(`lastWord:${segment_id}`, lastWord, 'EX', 600); // Expire après 10 min
    console.log(`✅ Dernier mot du segment ${segment_id} stocké en Redis : "${lastWord}"`);
}



      // Nettoyage des sous-titres de Redis après finalisation
      await redisClient.del(redisKey);

      // Notifier le frontend via WebSocket
      io.to(`session:${segment.session_id}`).emit("subtitle_finalized", { 
        segment_id, 
        finalText 
      });

      // Vérifier s'il y a un segment suivant
      const nextSegment = await VideoSegmentModel.getNextSegment(segment_id);
      if (nextSegment) {
          console.log(`➡️ Segment suivant ${nextSegment.segment_id} prêt à être traité.`);

          // Mettre à jour son statut en "assigned"
          await VideoSegmentModel.updateSegmentStatus(nextSegment.segment_id, 'assigned');

          // 🚀 Notifier le frontend via WebSocket
          io.to(`session:${segment.session_id}`).emit("segment_assigned", { 
              segment_id: nextSegment.segment_id,
              start_time: nextSegment.start_time,
              end_time: nextSegment.end_time
          });

          console.log(`🟢 Notification envoyée pour le segment ${nextSegment.segment_id}`);
      }

      return res.status(200).json({ message: "Segment finalisé avec succès.", finalText });

  } catch (error) {
      console.error("❌ Erreur lors de la finalisation du sous-titre :", error);
      return res.status(500).json({ message: "Erreur serveur." });
  }
}


async function getSubtitlesBySegment(req, res) {
  const { segment_id } = req.params;

  if (!segment_id) {
    return res.status(400).json({ message: "Le segment_id est requis." });
  }

  try {
    // Récupérer directement les sous-titres depuis PostgreSQL
    const subtitles = await SubtitleModel.getSubtitlesBySegment(segment_id);
    return res.status(200).json({
      message: "Sous-titres récupérés avec succès.",
      subtitles,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des sous-titres :", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

async function isDuplicateInSegment(segment_id, newText, created_by, cache = {}) {
  // 🔍 Vérifier en base de données
  if (!cache[segment_id]) {
    cache[segment_id] = await SubtitleModel.getSubtitlesBySegment(segment_id);
  }

  const existingSubtitles = cache[segment_id] || [];

  // 🔍 Vérifier aussi dans Redis
  const redisKey = `segment:${segment_id}:subtitles`;
  const wordsInRedis = await redisClient.lRange(redisKey, 0, -1);

  console.log("📌 Sous-titres en base :", existingSubtitles);
  console.log("📌 Mots en Redis :", wordsInRedis);

  // Fusionner les mots des deux sources
  const allWords = [...existingSubtitles.map(s => s.text), ...wordsInRedis];

  const maxAllowedDistance = Math.floor(newText.length * 0.3); // 30% de différence maximum

  for (let subtitle of allWords) {
    // Ignorer les textes soumis par le même utilisateur
    if (subtitle.created_by === created_by) {
      continue;
    }

    // Vérifier la similarité avec Levenshtein
    const distance = levenshtein.get(newText, subtitle.trim().toLowerCase());
    if (distance <= maxAllowedDistance) {
      console.log(
        `🚨 Doublon détecté dans le segment : "${newText}" vs "${subtitle}" `
      );
      return true; // 🔴 Doublon détecté !
    }
  }

  return false; // ✅ Aucun doublon détecté
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
    console.error("❌ Erreur lors de la récupération des sous-titres :", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

/**
 * Récupérer les sous-titres en cours d'écriture pour un segment (en temps réel)
 */
async function getLiveSubtitles(req, res) {
  const { segment_id } = req.params;

  if (!segment_id) {
    return res.status(400).json({ message: "Le segment_id est requis." });
  }

  try {
    const redisKey = `segment:${segment_id}:subtitles`;
    const words = await redisClient.lRange(redisKey, 0, -1);

    return res.status(200).json({
      message: "Sous-titres en cours récupérés avec succès.",
      words,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des sous-titres en temps réel :", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

module.exports = {
  assignUserToSegmentController,
  //addWordToSubtitle, // Ajout de mot en temps réel
  finalizeSubtitle,
  getLiveSubtitles,
  getSubtitlesBySegment,
  getSubtitlesBySession,
  isDuplicateInSegment,
  adjustTextWithNeighbors,
  setSocketInstance,
  addSubtitle,
  //validateSubtitleWords,
};
