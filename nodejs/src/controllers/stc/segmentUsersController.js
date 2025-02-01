const SegmentUserModel = require("../../models/SegmentUserModel");
const VideoSegmentModel = require("../../models/VideoSegmentModel");
const SubtitleModel = require("../../models/SubtitleModel");
const { client: redisClient } = require("../../redis/index");
const { isWordValid, suggestCorrection,cleanWord } = require("../../utils/dictionaryLoader");
let fullTranscript = ""; 
const pool = require("../../config/db"); // Import de la connexion PostgreSQL


// Assure-toi que le chemin est correct

const levenshtein = require("fast-levenshtein"); // Librairie pour Levenshtein
//const { validateWord, getSuggestion } = require("../../utils/dictionaryLoader");
let io;

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
async function addWordToSubtitle(req, res) {
  const { segment_id, word, created_by } = req.body;
  console.log("🔹 Nouveau mot reçu :", { segment_id, word, created_by });

  if (!segment_id || !word || !created_by) {
    return res.status(400).json({ message: "Champs obligatoires manquants." });
  }

  try {
    // 📌 Vérifier si le segment existe et s'il est finalisé
    const segment = await VideoSegmentModel.findById(segment_id);
    if (!segment) {
      return res.status(404).json({ message: "Segment introuvable." });
    }
    if (segment.is_finalized) {
      return res.status(403).json({ message: "Le segment est finalisé, impossible d'ajouter un mot." });
    }

    // 📌 Vérifier si l'utilisateur est assigné au segment
    const isUserAssigned = await SegmentUserModel.isUserAssignedToSegment(created_by, segment_id);
    if (!isUserAssigned) {
      return res.status(403).json({ message: "Non autorisé à sous-titrer ce segment." });
    }

    const cleanedWord = cleanWord(word);

    // 🔍 **LOG AVANT AJUSTEMENT**
    console.log(`🛠️ AVANT AJUSTEMENT : Mot reçu -> "${cleanedWord}" dans le segment ${segment_id}`);

    // **🔧 Ajustement avec les voisins**
    const adjustedWord = await adjustTextWithNeighbors(segment, cleanedWord);

    // 🔍 **LOG APRÈS AJUSTEMENT**
    console.log(`✅ APRÈS AJUSTEMENT : Mot ajusté -> "${adjustedWord}" dans le segment ${segment_id}`);

    // 📌 Vérification des doublons dans le même segment
    const isDuplicate = await isDuplicateInSegment(segment_id, adjustedWord, created_by);
    if (isDuplicate) {
      console.warn(`🚨 Mot "${adjustedWord}" rejeté car détecté comme doublon dans le même segment.`);
      return res.status(400).json({
        message: "Mot détecté comme doublon dans ce segment.",
        word: adjustedWord
      });
    } else {
      console.log(`✅ Mot "${adjustedWord}" accepté, aucun doublon détecté.`);
    }

    // 📌 Validation du mot
    if (!isWordValid(adjustedWord)) {
      const suggestion = suggestCorrection(adjustedWord);
      if (suggestion) {
        return res.status(200).json({
          message: "Mot invalide détecté.",
          word,
          suggestion,
        });
      } else {
        console.warn(`⚠️ Mot "${adjustedWord}" invalide mais accepté.`);
      }
    }
    
    // 📌 Stockage dans Redis
    const redisKey = `segment:${segment_id}:subtitles`;
    await redisClient.rPush(redisKey, adjustedWord);

    console.log("📡 Envoi du mot via socket :", { 
      segment_id, 
      word: adjustedWord, 
      user_id: created_by 
    });

    // 📡 Diffuser aux utilisateurs via Socket.IO
    io.to(`segment_${segment_id}`).emit("word_added", { 
      segment_id, 
      word: adjustedWord,
      user_id: created_by 
    });

    io.to(`session:${segment_id}`).emit("updateSubtitle", {
        text: adjustedWord,
        segment_id
    });

    return res.status(201).json({ message: "Mot ajouté avec succès.", word: adjustedWord });

  } catch (error) {
    console.error("❌ Erreur lors de l'ajout du mot :", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

/**
 * Finaliser le sous-titre après validation de tous les mots
 */
/**
 * Finaliser le sous-titre après validation de tous les mots
 */
async function finalizeSubtitle(req, res) {
  const { segment_id, created_by } = req.body;

  if (!segment_id || !created_by) {
    return res.status(400).json({ message: "Champs obligatoires manquants." });
  }

  try {
    const redisKey = `segment:${segment_id}:subtitles`;
    const words = await redisClient.lRange(redisKey, 0, -1);

    if (!words || words.length === 0) {
      return res.status(400).json({ message: "Aucun mot à finaliser." });
    }

    // ✅ Vérifier si les mots sont JSON ou de simples chaînes
    const parsedWords = words.map(word => {
      try {
        return JSON.parse(word); // Si JSON valide, on parse
      } catch (error) {
        return { word: word, created_by: created_by }; // Sinon, on l'utilise directement
      }
    });

    // ✅ Reconstruction du texte final
    const finalText = parsedWords.map(w => w.word).join(" ");

    // ✅ Prendre le created_by du premier mot
    const userCreatedBy = parsedWords.length > 0 ? parsedWords[0].created_by : null;

    console.log(`✅ Finalisation du sous-titre avec created_by: ${userCreatedBy}, Texte: "${finalText}"`);

    // ✅ Enregistrement en base avec le bon created_by
    await SubtitleModel.storeFinalSubtitle(segment_id, finalText, userCreatedBy);

    // ✅ Mise à jour du statut du segment
    await pool.query(`
      UPDATE video_segments 
      SET status = 'assigned', is_finalized = TRUE
      WHERE segment_id = $1
    `, [segment_id]);
    

    // ✅ Notifier tous les utilisateurs
    io.to(`session:${segment_id}`).emit("subtitle_finalized", { segment_id, finalText });

    // ✅ Supprimer les sous-titres de Redis
    // ✅ Supprimer les sous-titres du segment finalisé de Redis
await redisClient.del(`segment:${segment_id}:subtitles`);
console.log(`🗑️ Les sous-titres du segment ${segment_id} ont été supprimés de Redis après finalisation.`);


    return res.status(200).json({
      message: "Sous-titre finalisé avec succès.",
      finalText,
    });

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
async function adjustTextWithNeighbors(currentSegment, text) {
  console.log(`🛠️ Début de l'ajustement des sous-titres pour le segment ${currentSegment.segment_id}`);

  // 🔍 Récupérer le segment précédent (celui qui est finalisé en base)
  const previousSegment = await VideoSegmentModel.getPreviousSegment(currentSegment.segment_id);

  if (!previousSegment) {
    console.log("⚠️ Aucun segment précédent trouvé. Pas d'ajustement nécessaire.");
    return text; // Pas de segment précédent, donc pas d'ajustement
  }

  console.log(`🔄 Segment précédent détecté : ${previousSegment.segment_id}`);

  // 🔍 Récupérer le sous-titre finalisé du segment précédent
  const previousFinalizedSubtitle = await SubtitleModel.getFinalSubtitleBySegment(previousSegment.segment_id);

  if (!previousFinalizedSubtitle) {
    console.log(`⚠️ Aucun sous-titre finalisé trouvé pour le segment ${previousSegment.segment_id}`);
    return text; // Si le segment précédent n'a pas de sous-titre finalisé, pas d'ajustement
  }

  console.log(`📌 Sous-titre finalisé du segment ${previousSegment.segment_id} : "${previousFinalizedSubtitle.text}"`);

  // 🔍 Récupérer le premier mot du segment actuel (encore en Redis)
  const redisKey = `segment:${currentSegment.segment_id}:subtitles`;
  const wordsInRedis = await redisClient.lRange(redisKey, 0, -1);
  const firstWordInCurrentSegment = wordsInRedis.length > 0 ? wordsInRedis[0] : null;

  console.log(`📌 Premier mot en Redis du segment ${currentSegment.segment_id} : "${firstWordInCurrentSegment}"`);

  // Comparer le dernier mot du segment précédent et le premier mot du segment actuel
  if (firstWordInCurrentSegment) {
    const lastWords = previousFinalizedSubtitle.text.trim().toLowerCase().split(" ");
    const lastWordInPreviousSegment = lastWords[lastWords.length - 1];

    console.log(`🔍 Dernier mot du segment précédent : "${lastWordInPreviousSegment}"`);

    if (lastWordInPreviousSegment && levenshtein.get(lastWordInPreviousSegment, firstWordInCurrentSegment.toLowerCase()) <= 2) {
      console.warn(`🚨 Doublon détecté entre "${lastWordInPreviousSegment}" et "${firstWordInCurrentSegment}"`);

      // ❌ Supprimer le premier mot du segment actuel de Redis
      await redisClient.lRem(redisKey, 1, firstWordInCurrentSegment);
      console.log(`🗑️ Mot "${firstWordInCurrentSegment}" supprimé de Redis.`);

      // ✅ Mettre à jour le texte sans le mot en double
      text = text.replace(firstWordInCurrentSegment, "").trim();
    }
  }

  console.log(`✅ Texte après ajustement : "${text}"`);
  return text;
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
  addWordToSubtitle, // Ajout de mot en temps réel
  finalizeSubtitle,
  getLiveSubtitles,
  getSubtitlesBySegment,
  getSubtitlesBySession,
  isDuplicateInSegment,
  adjustTextWithNeighbors,
  setSocketInstance,
  adjustTextWithNeighbors,
  //validateSubtitleWords,
};
