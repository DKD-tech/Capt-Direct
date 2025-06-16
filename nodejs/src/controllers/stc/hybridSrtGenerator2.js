// const VideoSegmentModel = require("../../models/VideoSegmentModel");
// const SubtitleModel = require("../../models/SubtitleModel");

// /**
//  * Convertit les secondes en format SRT (HH:MM:SS,mmm)
//  */
// function formatSrtTime(seconds) {
//   const date = new Date(seconds * 1000);
//   const hh = String(date.getUTCHours()).padStart(2, "0");
//   const mm = String(date.getUTCMinutes()).padStart(2, "0");
//   const ss = String(date.getUTCSeconds()).padStart(2, "0");
//   const ms = String(date.getUTCMilliseconds()).padStart(3, "0");
//   return `${hh}:${mm}:${ss},${ms}`;
// }

// /**
//  * Convertit une chaîne de temps en secondes
//  */
// function timeToSeconds(timeStr) {
//   if (typeof timeStr === "number") return timeStr;
//   const [h, m, s] = timeStr.split(":").map(Number);
//   return h * 3600 + m * 60 + s;
// }

// /**
//  * CORRECTION PRINCIPALE : Dédoublonner les textes pour éviter les répétitions
//  */
// function removeDuplicateTexts(texts) {
//   const seen = new Set();
//   const result = [];

//   for (const text of texts) {
//     const cleaned = text.trim().toLowerCase();
//     if (cleaned && !seen.has(cleaned)) {
//       seen.add(cleaned);
//       result.push(text.trim());
//     }
//   }

//   return result;
// }

// /**
//  * Découpe intelligemment un texte long en segments de taille raisonnable
//  * VERSION CORRIGÉE : Éviter la coupure au milieu des mots
//  */
// function smartTextSplit(text, maxWordsPerSegment = 8) {
//   if (!text || !text.trim()) return [];

//   const sentences = text.split(/[.!?]+/).filter((s) => s.trim());
//   const segments = [];

//   let currentSegment = "";
//   let wordCount = 0;

//   for (const sentence of sentences) {
//     const trimmedSentence = sentence.trim();
//     if (!trimmedSentence) continue;

//     const sentenceWords = trimmedSentence.split(/\s+/).length;

//     // Si ajouter cette phrase dépasse la limite ET qu'on a déjà du contenu
//     if (wordCount + sentenceWords > maxWordsPerSegment && currentSegment) {
//       segments.push(currentSegment.trim() + ".");
//       currentSegment = trimmedSentence;
//       wordCount = sentenceWords;
//     } else {
//       currentSegment += (currentSegment ? " " : "") + trimmedSentence;
//       wordCount += sentenceWords;
//     }
//   }

//   if (currentSegment.trim()) {
//     segments.push(
//       currentSegment.trim() + (currentSegment.endsWith(".") ? "" : ".")
//     );
//   }

//   // Si on n'a qu'un segment mais qu'il est trop long, on force le découpage par mots
//   if (segments.length === 1 && wordCount > maxWordsPerSegment) {
//     const words = text.trim().split(/\s+/);
//     const forcedSegments = [];

//     for (let i = 0; i < words.length; i += maxWordsPerSegment) {
//       forcedSegments.push(words.slice(i, i + maxWordsPerSegment).join(" "));
//     }

//     return forcedSegments;
//   }

//   return segments.length > 0 ? segments : [text];
// }

// /**
//  * CORRECTION PRINCIPALE : Résolution des conflits simplifiée
//  */
// function resolveTimingConflicts(srtEntries) {
//   const sortedEntries = [...srtEntries].sort(
//     (a, b) => a.startTime - b.startTime
//   );
//   const minGap = 0.1;

//   for (let i = 1; i < sortedEntries.length; i++) {
//     const current = sortedEntries[i];
//     const previous = sortedEntries[i - 1];

//     // Si le segment actuel commence avant la fin du précédent
//     if (current.startTime < previous.endTime + minGap) {
//       // CORRECTION : Simplement décaler le début, ne pas imposer de durée minimale
//       current.startTime = previous.endTime + minGap;

//       // Si cela crée un problème avec la fin, ajuster la fin aussi
//       if (current.endTime <= current.startTime) {
//         current.endTime = current.startTime + 1.0; // durée minimale de 1 seconde
//       }
//     }
//   }

//   return sortedEntries;
// }

// /**
//  * Pipeline principal amélioré - VERSION CORRIGÉE
//  */
// async function generateImprovedSrt(session_id) {
//   console.log(`[Improved SRT] Génération pour la session ${session_id}...`);

//   // 1. Récupérer les segments vidéo dans l'ordre chronologique
//   let segments = await VideoSegmentModel.findManyBy({ session_id });

//   segments = segments
//     .filter((s) => s.start_time && s.end_time)
//     .sort((a, b) => timeToSeconds(a.start_time) - timeToSeconds(b.start_time));

//   if (!segments.length) {
//     throw new Error("Aucun segment trouvé pour cette session");
//   }

//   console.log(`[Improved SRT] ${segments.length} segments récupérés`);

//   // 2. Pour chaque segment, récupérer et traiter les sous-titres
//   const srtEntries = [];

//   for (const segment of segments) {
//     const subtitles = await SubtitleModel.getSubtitlesBySegment(
//       segment.segment_id
//     );

//     if (subtitles.length === 0) {
//       console.log(
//         `[Improved SRT] ⚠️ Aucun sous-titre pour segment ${segment.segment_id}`
//       );
//       continue;
//     }

//     // CORRECTION : Dédoublonner avant de combiner
//     const allTexts = subtitles.map((s) => s.text).filter(Boolean);
//     const uniqueTexts = removeDuplicateTexts(allTexts);
//     const fullText = uniqueTexts.join(" ").trim();

//     if (!fullText) continue;

//     // Découper intelligemment le texte
//     const textSegments = smartTextSplit(fullText);

//     const segmentStart = timeToSeconds(segment.start_time);
//     const segmentEnd = timeToSeconds(segment.end_time);
//     const segmentDuration = segmentEnd - segmentStart;

//     // Distribuer les sous-segments dans la durée du segment
//     textSegments.forEach((textPart, index) => {
//       const subSegmentDuration = segmentDuration / textSegments.length;
//       const startTime = segmentStart + index * subSegmentDuration;
//       const endTime = startTime + subSegmentDuration;

//       srtEntries.push({
//         startTime: parseFloat(startTime.toFixed(3)),
//         endTime: parseFloat(endTime.toFixed(3)),
//         text: textPart,
//       });
//     });
//   }

//   // 3. Résoudre les conflits de timing
//   const resolvedEntries = resolveTimingConflicts(srtEntries);

//   // 4. Générer le fichier SRT final
//   const srtContent = resolvedEntries
//     .map((entry, index) => {
//       return `${index + 1}\n${formatSrtTime(
//         entry.startTime
//       )} --> ${formatSrtTime(entry.endTime)}\n${entry.text}\n`;
//     })
//     .join("\n");

//   console.log(
//     `[Improved SRT] ✅ ${resolvedEntries.length} entrées SRT générées`
//   );
//   return srtContent;
// }

// /**
//  * Version alternative avec groupement intelligent des segments chevauchants
//  * VERSION CORRIGÉE
//  */
// async function generateGroupedSrt(session_id) {
//   console.log(
//     `[Grouped SRT] Génération avec groupement pour session ${session_id}...`
//   );

//   let segments = await VideoSegmentModel.findManyBy({ session_id });

//   segments = segments
//     .filter((s) => s.start_time && s.end_time)
//     .sort((a, b) => timeToSeconds(a.start_time) - timeToSeconds(b.start_time));

//   if (!segments.length) {
//     throw new Error("Aucun segment trouvé");
//   }

//   // Grouper les segments qui se chevauchent
//   const groups = [];
//   let currentGroup = [segments[0]];

//   for (let i = 1; i < segments.length; i++) {
//     const lastInGroup = currentGroup[currentGroup.length - 1];
//     const current = segments[i];

//     const lastEnd = timeToSeconds(lastInGroup.end_time);
//     const currentStart = timeToSeconds(current.start_time);

//     // Tolérance de 2 secondes pour considérer un chevauchement
//     if (currentStart <= lastEnd + 2) {
//       currentGroup.push(current);
//     } else {
//       groups.push(currentGroup);
//       currentGroup = [current];
//     }
//   }
//   groups.push(currentGroup);

//   console.log(`[Grouped SRT] ${groups.length} groupes créés`);

//   const srtEntries = [];

//   for (const group of groups) {
//     // Calculer les bornes du groupe
//     const groupStart = Math.min(
//       ...group.map((s) => timeToSeconds(s.start_time))
//     );
//     const groupEnd = Math.max(...group.map((s) => timeToSeconds(s.end_time)));

//     // CORRECTION : Récupérer tous les sous-titres du groupe et dédoublonner
//     const allTexts = [];
//     for (const segment of group) {
//       const subtitles = await SubtitleModel.getSubtitlesBySegment(
//         segment.segment_id
//       );
//       allTexts.push(...subtitles.map((s) => s.text).filter(Boolean));
//     }

//     if (allTexts.length === 0) continue;

//     // CORRECTION : Dédoublonner avant de combiner
//     const uniqueTexts = removeDuplicateTexts(allTexts);
//     const combinedText = uniqueTexts.join(" ").trim();

//     if (!combinedText) continue;

//     const textSegments = smartTextSplit(combinedText, 10);

//     const groupDuration = groupEnd - groupStart;

//     // Distribuer dans le temps
//     textSegments.forEach((textPart, index) => {
//       const subDuration = groupDuration / textSegments.length;
//       const startTime = groupStart + index * subDuration;
//       const endTime = Math.min(groupEnd, startTime + subDuration);

//       srtEntries.push({
//         startTime: parseFloat(startTime.toFixed(3)),
//         endTime: parseFloat(endTime.toFixed(3)),
//         text: textPart,
//       });
//     });
//   }

//   const resolvedEntries = resolveTimingConflicts(srtEntries);

//   return resolvedEntries
//     .map((entry, index) => {
//       return `${index + 1}\n${formatSrtTime(
//         entry.startTime
//       )} --> ${formatSrtTime(entry.endTime)}\n${entry.text}\n`;
//     })
//     .join("\n");
// }

// /**
//  * Controller Express pour l'export SRT amélioré
//  */
// async function exportImprovedSrtController(req, res) {
//   const { session_id } = req.params;

//   try {
//     const srtContent = await generateImprovedSrt(session_id);

//     const fs = require("fs");
//     const path = require("path");

//     const filePath = path.join(
//       __dirname,
//       `../../../srt_exports/session_${session_id}_improved.srt`
//     );

//     // S'assurer que le dossier existe
//     const dir = path.dirname(filePath);
//     if (!fs.existsSync(dir)) {
//       fs.mkdirSync(dir, { recursive: true });
//     }

//     fs.writeFileSync(filePath, srtContent, "utf8");
//     console.log(`[Improved SRT] Fichier sauvegardé : ${filePath}`);

//     return res.download(filePath);
//   } catch (error) {
//     console.error("❌ Erreur export SRT amélioré :", error);
//     return res.status(500).json({
//       message: "Erreur lors de la génération du SRT amélioré",
//       error: error.message,
//     });
//   }
// }

// module.exports = {
//   generateImprovedSrt,
//   exportImprovedSrtController,
//   generateGroupedSrt,
//   smartTextSplit,
//   resolveTimingConflicts,
//   formatSrtTime,
// };

/**
 * INTÉGRATION DÉDUPLICATION DANS HYBRIDSRTGENERATOR
 * Modification de ton code existant pour inclure la déduplication
 */
// Ajouter après les autres imports
const axios = require("axios");

const VideoSegmentModel = require("../../models/VideoSegmentModel");
const SubtitleModel = require("../../models/SubtitleModel");

// Import des modules de déduplication
const {
  basicTextDeduplication,
  detectCrossSegmentDuplicates,
} = require("./deduplication/basicDeduplication");
const {
  intermediateTextDeduplication,
  deduplicateSrtSegments,
} = require("./deduplication/intermediateDeduplication");

/**
 * Configuration de LanguageTool
 */
const LANGUAGETOOL_CONFIG = {
  apiUrl: "https://api.languagetool.org/v2/check",
  defaultLanguage: "fr",
  enabled: true,
  timeout: 15000, // Augmenté à 15 secondes pour les gros textes
  maxTextLength: 10000, // Augmenté à 10000 caractères par requête

  // // Nouvelles options pour la gestion des gros volumes
  // retry: {
  //   maxAttempts: 3,
  //   delayMs: 1000,
  //   backoffMultiplier: 2, // 1s, 2s, 4s entre les tentatives
  // },

  // // Chunking pour textes très longs
  // chunking: {
  //   enabled: true,
  //   chunkSize: 8000, // Taille des chunks si le texte dépasse maxTextLength
  //   overlapSize: 200, // Chevauchement entre chunks pour préserver le contexte
  // },

  // // Rate limiting pour éviter de surcharger l'API
  // rateLimiting: {
  //   enabled: true,
  //   requestsPerMinute: 20, // Limite LanguageTool gratuit
  //   delayBetweenRequests: 100, // 100ms entre chaque requête
  // },

  // // Fallback en cas d'échec répété
  // fallback: {
  //   enabled: true,
  //   basicCorrections: true, // Corrections simples sans API
  //   skipOnFailure: false, // Continue le traitement même si la correction échoue
  // },
};

/**
 * Configuration de déduplication
 */
const DEDUPLICATION_CONFIG = {
  // Niveau de déduplication : 'basic', 'intermediate', 'off'
  level: "intermediate",

  // Options pour déduplication intermédiaire
  windowSize: 5,
  threshold: 0.7,
  enablePatternDetection: true,
  enableSlidingWindow: true,
  enableCrossSegment: true,
  enableContextual: true,
  contextualThreshold: 0.6,
};

// Ajouter ces nouvelles fonctions avant vos fonctions existantes

/**
 * Correction orthographique avec LanguageTool
 */
async function correctTextWithLanguageTool(text, language = "fr") {
  if (!text || !text.trim() || !LANGUAGETOOL_CONFIG.enabled) {
    return { correctedText: text, corrections: [] };
  }

  try {
    const response = await axios.post(
      LANGUAGETOOL_CONFIG.apiUrl,
      new URLSearchParams({
        text: text.substring(0, LANGUAGETOOL_CONFIG.maxTextLength),
        language: language,
        enabledOnly: "false",
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: LANGUAGETOOL_CONFIG.timeout,
      }
    );

    const matches = response.data.matches || [];
    if (matches.length === 0) {
      return { correctedText: text, corrections: [] };
    }

    let correctedText = text;
    const corrections = [];

    // Appliquer les corrections de la fin vers le début pour préserver les indices
    matches.reverse().forEach((match) => {
      if (match.replacements && match.replacements.length > 0) {
        const replacement = match.replacements[0].value;
        const before = correctedText.substring(
          match.offset,
          match.offset + match.length
        );

        correctedText =
          correctedText.substring(0, match.offset) +
          replacement +
          correctedText.substring(match.offset + match.length);

        corrections.push({
          original: before,
          corrected: replacement,
          rule: match.rule?.description || "Correction automatique",
        });
      }
    });

    return { correctedText, corrections };
  } catch (error) {
    console.warn(`[LanguageTool] Erreur correction: ${error.message}`);
    // CORRECTION: Retourner le texte original en cas d'erreur
    return { correctedText: text, corrections: [] };
  }
}

/**
 * Correction par lots avec rate limiting
 */
async function correctTextsBatch(texts, language = "fr") {
  const results = [];
  let totalCorrections = 0;

  for (let i = 0; i < texts.length; i++) {
    const result = await correctTextWithLanguageTool(texts[i], language);
    results.push(result);
    totalCorrections += result.corrections.length;

    // Rate limiting
    if (i < texts.length - 1 && LANGUAGETOOL_CONFIG.rateLimitDelay > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, LANGUAGETOOL_CONFIG.rateLimitDelay)
      );
    }
  }

  console.log(
    `[LanguageTool] ${totalCorrections} corrections appliquées sur ${texts.length} textes`
  );
  return results;
}

/**
 * Correction de textes longs par segments
 */
async function correctLongText(text, language) {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim());
  const correctedSentences = [];

  for (const sentence of sentences) {
    if (sentence.trim()) {
      const corrected = await correctTextWithLanguageTool(
        sentence.trim() + ".",
        language
      );
      correctedSentences.push(corrected);

      // Petit délai pour éviter de surcharger l'API
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return correctedSentences.join(" ");
}

/**
 * Applique les corrections suggérées par LanguageTool
 */
function applyCorrections(originalText, matches) {
  if (!matches || matches.length === 0) {
    return originalText;
  }

  let correctedText = originalText;
  let offset = 0;

  // Trier les matches par position (du plus tardif au plus tôt pour éviter les décalages)
  const sortedMatches = matches.sort((a, b) => b.offset - a.offset);

  for (const match of sortedMatches) {
    // Ne prendre que la première suggestion si elle existe
    if (match.replacements && match.replacements.length > 0) {
      const suggestion = match.replacements[0].value;
      const start = match.offset;
      const end = match.offset + match.length;

      // Appliquer la correction
      correctedText =
        correctedText.substring(0, start) +
        suggestion +
        correctedText.substring(end);

      console.log(
        `[LanguageTool] ✅ Correction: "${match.context.text}" → "${suggestion}"`
      );
    }
  }

  return correctedText;
}

/**
 * Correction par lot avec gestion d'erreurs robuste
 */
async function correctTextsBatch(
  texts,
  language = LANGUAGETOOL_CONFIG.defaultLanguage
) {
  const results = [];
  let totalCorrections = 0;

  for (let i = 0; i < texts.length; i++) {
    try {
      const result = await correctTextWithLanguageTool(texts[i], language);
      results.push(result);
      totalCorrections += result.corrections.length;

      // Log du progrès
      if (i % 10 === 0) {
        console.log(
          `[LanguageTool] Progression: ${i + 1}/${texts.length} textes corrigés`
        );
      }

      // Délai pour éviter les limits de rate limiting
      if (i < texts.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`[LanguageTool] Erreur sur texte ${i}: ${error.message}`);
      // CORRECTION: Retourner le format attendu même en cas d'erreur
      results.push({ correctedText: texts[i], corrections: [] });
    }
  }

  console.log(
    `[LanguageTool] ${totalCorrections} corrections appliquées sur ${texts.length} textes`
  );
  return results;
}

/**
 * Applique la déduplication selon le niveau configuré
 */
function applyDeduplication(text, level = DEDUPLICATION_CONFIG.level) {
  switch (level) {
    case "basic":
      return basicTextDeduplication(text);

    case "intermediate":
      return intermediateTextDeduplication(text, DEDUPLICATION_CONFIG);

    case "off":
    default:
      return text;
  }
}

/**
 * Convertit les secondes en format SRT (HH:MM:SS,mmm)
 */
function formatSrtTime(seconds) {
  const date = new Date(seconds * 1000);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  const ms = String(date.getUTCMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss},${ms}`;
}

/**
 * Convertit une chaîne de temps en secondes
 */
function timeToSeconds(timeStr) {
  if (typeof timeStr === "number") return timeStr;
  const [h, m, s] = timeStr.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

/**
 * Découpe intelligemment un texte avec déduplication ET correction orthographique
 */
async function smartTextSplitWithCorrectionAndDeduplication(
  text,
  maxWordsPerSegment = 8,
  language = "fr"
) {
  if (!text || !text.trim()) return [];

  try {
    // 1. Déduplication d'abord
    const deduplicatedText = applyDeduplication(text);

    // 2. Correction orthographique
    const correctionResult = await correctTextWithLanguageTool(
      deduplicatedText,
      language
    );

    // CORRECTION PRINCIPALE: Extraire le texte corrigé de l'objet retourné
    const correctedText = correctionResult.correctedText || deduplicatedText;

    // 3. Découpage intelligent
    const sentences = correctedText.split(/[.!?]+/).filter((s) => s.trim());
    const segments = [];

    let currentSegment = "";
    let wordCount = 0;

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      const sentenceWords = trimmedSentence.split(/\s+/).length;

      if (wordCount + sentenceWords > maxWordsPerSegment && currentSegment) {
        segments.push(currentSegment.trim() + ".");
        currentSegment = trimmedSentence;
        wordCount = sentenceWords;
      } else {
        currentSegment += (currentSegment ? " " : "") + trimmedSentence;
        wordCount += sentenceWords;
      }
    }

    if (currentSegment.trim()) {
      segments.push(
        currentSegment.trim() + (currentSegment.endsWith(".") ? "" : ".")
      );
    }

    // Forcer le découpage si nécessaire
    if (segments.length === 1 && wordCount > maxWordsPerSegment) {
      const words = correctedText.trim().split(/\s+/);
      const forcedSegments = [];

      for (let i = 0; i < words.length; i += maxWordsPerSegment) {
        forcedSegments.push(words.slice(i, i + maxWordsPerSegment).join(" "));
      }

      return forcedSegments;
    }

    return segments.length > 0 ? segments : [correctedText];
  } catch (error) {
    console.error(`[SmartTextSplit] Erreur: ${error.message}`);
    // En cas d'erreur, faire un découpage simple sans correction
    return smartTextSplitWithDeduplication(text, maxWordsPerSegment);
  }
}

/**
 * Découpe intelligemment un texte long en segments avec déduplication
 */
function smartTextSplitWithDeduplication(text, maxWordsPerSegment = 8) {
  // 1. Appliquer la déduplication d'abord
  const cleanedText = applyDeduplication(text);

  // 2. Puis découper intelligemment
  const sentences = cleanedText.split(/[.!?]+/).filter((s) => s.trim());
  const segments = [];

  let currentSegment = "";
  let wordCount = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.trim().split(/\s+/).length;

    if (wordCount + sentenceWords > maxWordsPerSegment && currentSegment) {
      segments.push(currentSegment.trim());
      currentSegment = sentence.trim() + ".";
      wordCount = sentenceWords;
    } else {
      currentSegment += (currentSegment ? " " : "") + sentence.trim() + ".";
      wordCount += sentenceWords;
    }
  }

  if (currentSegment.trim()) {
    segments.push(currentSegment.trim());
  }

  // Si un segment est encore trop long, forcer le découpage
  if (segments.length === 1 && wordCount > maxWordsPerSegment) {
    const words = cleanedText.trim().split(/\s+/);
    const forcedSegments = [];

    for (let i = 0; i < words.length; i += maxWordsPerSegment) {
      forcedSegments.push(words.slice(i, i + maxWordsPerSegment).join(" "));
    }

    return forcedSegments;
  }

  return segments.length > 0 ? segments : [cleanedText];
  // // NOUVEAU CODE SIMPLE - Découpage par groupes de mots équilibrés
  // const words = cleanedText.trim().split(/\s+/);
  // const totalWords = words.length;

  // // Si le texte est déjà court, pas besoin de découpage
  // if (totalWords <= maxWordsPerSegment) {
  //   return [cleanedText];
  // }

  // // Découpage équilibré par groupes de mots (Option 1)
  // const segments = [];
  // const idealSegmentCount = Math.ceil(totalWords / maxWordsPerSegment);
  // const wordsPerSegment = Math.ceil(totalWords / idealSegmentCount);

  // for (let i = 0; i < totalWords; i += wordsPerSegment) {
  //   const segmentWords = words.slice(i, i + wordsPerSegment);
  //   segments.push(segmentWords.join(" "));
  // }

  // return segments;
}

/**
 * Résout les conflits de timing entre segments
 */
function resolveTimingConflicts(srtEntries) {
  const sortedEntries = [...srtEntries].sort(
    (a, b) => a.startTime - b.startTime
  );
  const minGap = 0.1;

  for (let i = 1; i < sortedEntries.length; i++) {
    const current = sortedEntries[i];
    const previous = sortedEntries[i - 1];

    if (current.startTime < previous.endTime) {
      current.startTime = previous.endTime + minGap;

      const minDuration = 1.0;
      if (current.endTime - current.startTime < minDuration) {
        current.endTime = current.startTime + minDuration;
      }
    }
  }

  return sortedEntries;
}

/**
 * Pipeline principal avec déduplication intégrée
 */
async function generateImprovedSrtWithDeduplication(session_id, options = {}) {
  console.log(
    `[Improved SRT + Dedup] Génération pour session ${session_id}...`
  );

  // Merger les options avec la config par défaut
  const config = { ...DEDUPLICATION_CONFIG, ...options };

  // 1. Récupérer les segments vidéo
  let segments = await VideoSegmentModel.findManyBy({ session_id });

  segments = segments
    .filter((s) => s.start_time && s.end_time)
    .sort((a, b) => timeToSeconds(a.start_time) - timeToSeconds(b.start_time));

  if (!segments.length) {
    throw new Error("Aucun segment trouvé pour cette session");
  }

  console.log(`[Improved SRT + Dedup] ${segments.length} segments récupérés`);

  // 2. Traiter chaque segment avec déduplication
  const srtEntries = [];

  for (const segment of segments) {
    const subtitles = await SubtitleModel.getSubtitlesBySegment(
      segment.segment_id
    );

    if (subtitles.length === 0) {
      console.log(
        `[Dedup] ⚠️ Aucun sous-titre pour segment ${segment.segment_id}`
      );
      continue;
    }

    // Combiner tous les sous-titres du segment
    const fullText = subtitles
      .map((s) => s.text)
      .join(" ")
      .trim();

    if (!fullText) continue;

    // Découper avec déduplication intégrée
    const textSegments = smartTextSplitWithDeduplication(fullText);

    const segmentStart = timeToSeconds(segment.start_time);
    const segmentEnd = timeToSeconds(segment.end_time);
    const segmentDuration = segmentEnd - segmentStart;

    // Distribuer les sous-segments
    textSegments.forEach((textPart, index) => {
      const subSegmentDuration = segmentDuration / textSegments.length;
      const startTime = segmentStart + index * subSegmentDuration;
      const endTime = startTime + subSegmentDuration;

      srtEntries.push({
        startTime: parseFloat(startTime.toFixed(3)),
        endTime: parseFloat(endTime.toFixed(3)),
        text: textPart,
      });
    });
  }

  console.log(
    `[Dedup] ${srtEntries.length} entrées avant déduplication cross-segment`
  );

  // 3. Déduplication cross-segment selon configuration
  let finalEntries = srtEntries;

  if (config.level === "intermediate") {
    finalEntries = deduplicateSrtSegments(srtEntries, config);
  } else if (config.level === "basic" && config.enableCrossSegment) {
    finalEntries = detectCrossSegmentDuplicates(srtEntries);
  }

  console.log(
    `[Dedup] ${finalEntries.length} entrées après déduplication cross-segment`
  );

  // 4. Résoudre les conflits de timing
  const resolvedEntries = resolveTimingConflicts(finalEntries);

  // 5. Générer le fichier SRT final
  const srtContent = resolvedEntries
    .map((entry, index) => {
      return `${index + 1}\n${formatSrtTime(
        entry.startTime
      )} --> ${formatSrtTime(entry.endTime)}\n${entry.text}\n`;
    })
    .join("\n");

  console.log(
    `[Improved SRT + Dedup] ✅ ${resolvedEntries.length} entrées SRT générées avec déduplication`
  );

  return {
    srtContent,
    stats: {
      originalEntries: srtEntries.length,
      deduplicatedEntries: finalEntries.length,
      finalEntries: resolvedEntries.length,
      deduplicationLevel: config.level,
    },
  };
}

/**
 * Controller Express mis à jour
 */
async function exportImprovedSrtWithDeduplicationController(req, res) {
  const { session_id } = req.params;
  const { level = "intermediate", windowSize = 5, threshold = 0.7 } = req.query;

  try {
    const options = {
      level,
      windowSize: parseInt(windowSize),
      threshold: parseFloat(threshold),
    };

    const result = await generateImprovedSrtWithDeduplication(
      session_id,
      options
    );

    const fs = require("fs");
    const path = require("path");

    const filePath = path.join(
      __dirname,
      `../../../srt_exports/session_${session_id}_dedup_${level}.srt`
    );

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, result.srtContent, "utf8");
    console.log(`[Improved SRT + Dedup] Fichier sauvegardé : ${filePath}`);
    console.log(`[Stats] ${JSON.stringify(result.stats, null, 2)}`);

    return res.download(filePath);
  } catch (error) {
    console.error("❌ Erreur export SRT avec déduplication :", error);
    return res.status(500).json({
      message: "Erreur lors de la génération du SRT avec déduplication",
      error: error.message,
    });
  }
}

function splitTextByMaxLength(text, maxLength = 40) {
  const words = text.trim().split(/\s+/);
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxLength) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Version alternative avec groupement intelligent des segments chevauchants + déduplication qui fonctionnait
 */
async function generateGroupedSrtWithDeduplication(session_id, options = {}) {
  console.log(
    `[Grouped SRT + Dedup] Génération avec groupement pour session ${session_id}...`
  );

  // Merger les options avec la config par défaut
  const config = { ...DEDUPLICATION_CONFIG, ...options };

  let segments = await VideoSegmentModel.findManyBy({ session_id });

  segments = segments
    .filter((s) => s.start_time && s.end_time)
    .sort((a, b) => timeToSeconds(a.start_time) - timeToSeconds(b.start_time));

  if (!segments.length) {
    throw new Error("Aucun segment trouvé");
  }

  // Grouper les segments qui se chevauchent
  const groups = [];
  let currentGroup = [segments[0]];

  for (let i = 1; i < segments.length; i++) {
    const lastInGroup = currentGroup[currentGroup.length - 1];
    const current = segments[i];

    const lastEnd = timeToSeconds(lastInGroup.end_time);
    const currentStart = timeToSeconds(current.start_time);

    // Tolérance de 2 secondes pour considérer un chevauchement
    if (currentStart <= lastEnd + 2) {
      currentGroup.push(current);
    } else {
      groups.push(currentGroup);
      currentGroup = [current];
    }
  }
  groups.push(currentGroup);

  console.log(`[Grouped SRT + Dedup] ${groups.length} groupes créés`);

  const srtEntries = [];

  for (const group of groups) {
    // Calculer les bornes du groupe
    const groupStart = Math.min(
      ...group.map((s) => timeToSeconds(s.start_time))
    );
    const groupEnd = Math.max(...group.map((s) => timeToSeconds(s.end_time)));

    // Récupérer tous les sous-titres du groupe
    const allTexts = [];
    for (const segment of group) {
      const subtitles = await SubtitleModel.getSubtitlesBySegment(
        segment.segment_id
      );
      allTexts.push(...subtitles.map((s) => s.text).filter(Boolean));
    }

    if (allTexts.length === 0) continue;

    // Combiner et nettoyer les textes avec déduplication
    const combinedText = allTexts.join(" ").trim();
    const cleanedText = applyDeduplication(combinedText, config.level);

    if (!cleanedText) continue;

    const textSegments = smartTextSplitWithDeduplication(cleanedText, 10);

    const groupDuration = groupEnd - groupStart;

    // Distribuer dans le temps
    textSegments.forEach((textPart, index) => {
      const subDuration = groupDuration / textSegments.length;
      const startTime = groupStart + index * subDuration;
      const endTime = Math.min(groupEnd, startTime + subDuration);

      srtEntries.push({
        startTime: parseFloat(startTime.toFixed(3)),
        endTime: parseFloat(endTime.toFixed(3)),
        text: textPart,
      });
    });
  }

  console.log(
    `[Grouped Dedup] ${srtEntries.length} entrées avant déduplication cross-segment`
  );

  // Déduplication cross-segment selon configuration
  let finalEntries = srtEntries;

  if (config.level === "intermediate") {
    finalEntries = deduplicateSrtSegments(srtEntries, config);
  } else if (config.level === "basic" && config.enableCrossSegment) {
    finalEntries = detectCrossSegmentDuplicates(srtEntries);
  }

  console.log(
    `[Grouped Dedup] ${finalEntries.length} entrées après déduplication cross-segment`
  );

  // Résoudre les conflits de timing
  const resolvedEntries = resolveTimingConflicts(finalEntries);

  const srtContent = resolvedEntries
    .map((entry, index) => {
      return `${index + 1}\n${formatSrtTime(
        entry.startTime
      )} --> ${formatSrtTime(entry.endTime)}\n${entry.text}\n`;
    })
    .join("\n");

  console.log(
    `[Grouped SRT + Dedup] ✅ ${resolvedEntries.length} entrées SRT générées avec groupement et déduplication`
  );

  return {
    srtContent,
    stats: {
      groups: groups.length,
      originalEntries: srtEntries.length,
      deduplicatedEntries: finalEntries.length,
      finalEntries: resolvedEntries.length,
      deduplicationLevel: config.level,
    },
  };
}

// 🚀 NOUVELLE FONCTION V2 - FUSION INTELLIGENTE SRT
// ================================================================

// async function generateGroupedSrtWithDeduplication(session_id, options = {}) {
//   const mode = options.mode || "intelligent"; // "legacy" par défaut
//   const config = {
//     ...DEDUPLICATION_CONFIG,
//     ...options,
//   };

//   console.log(
//     `[Grouped SRT + Dedup] Mode sélectionné : ${mode.toUpperCase()} pour session ${session_id}`
//   );

//   // Récupération des segments
//   let segments = await VideoSegmentModel.findManyBy({ session_id });
//   segments = segments
//     .filter((s) => s.start_time && s.end_time)
//     .sort((a, b) => timeToSeconds(a.start_time) - timeToSeconds(b.start_time));

//   if (!segments.length) throw new Error("Aucun segment trouvé");

//   // ==== 🧠 MODE INTELLIGENT ====
//   if (mode === "intelligent") {
//     const groups = createSmartGroups(segments, config);
//     console.log(`[INTELLIGENT] ${groups.length} groupes créés`);

//     const srtEntries = [];

//     for (const group of groups) {
//       const groupStart = Math.min(
//         ...group.map((s) => timeToSeconds(s.start_time))
//       );
//       const groupEnd = Math.max(...group.map((s) => timeToSeconds(s.end_time)));
//       const groupTexts = await collectAndMergeGroupTexts(group, config);

//       if (!groupTexts.length) continue;

//       const processedTexts = processGroupTexts(groupTexts, config);
//       if (!processedTexts.length) continue;

//       const entries = distributeTextsInTime(
//         processedTexts,
//         groupStart,
//         groupEnd,
//         config.textDistributionMode
//       );
//       srtEntries.push(...entries);
//     }

//     let finalEntries = srtEntries;
//     if (config.level === "intermediate") {
//       finalEntries = deduplicateSrtSegments(srtEntries, config);
//     } else if (config.level === "basic" && config.enableCrossSegment) {
//       finalEntries = detectCrossSegmentDuplicates(srtEntries);
//     }

//     const resolved = resolveTimingConflictsAdvanced(finalEntries);

//     const srtContent = resolved
//       .map(
//         (entry, i) =>
//           `${i + 1}\n${formatSrtTime(entry.startTime)} --> ${formatSrtTime(
//             entry.endTime
//           )}\n${entry.text}\n`
//       )
//       .join("\n");

//     return {
//       srtContent,
//       stats: {
//         originalSegments: segments.length,
//         finalEntries: resolved.length,
//         deduplicationLevel: config.level,
//         mode: "intelligent",
//       },
//     };
//   }

//   // ==== 🧱 MODE LEGACY ====
//   if (mode === "legacy") {
//     // Groupement simple par chevauchement (2s)
//     const groups = [];
//     let currentGroup = [segments[0]];

//     for (let i = 1; i < segments.length; i++) {
//       const last = currentGroup[currentGroup.length - 1];
//       const current = segments[i];

//       const lastEnd = timeToSeconds(last.end_time);
//       const currentStart = timeToSeconds(current.start_time);

//       if (currentStart <= lastEnd + 2) {
//         currentGroup.push(current);
//       } else {
//         groups.push(currentGroup);
//         currentGroup = [current];
//       }
//     }
//     groups.push(currentGroup);
//     console.log(`[LEGACY] ${groups.length} groupes créés`);

//     const srtEntries = [];

//     for (const group of groups) {
//       const groupStart = Math.min(
//         ...group.map((s) => timeToSeconds(s.start_time))
//       );
//       const groupEnd = Math.max(...group.map((s) => timeToSeconds(s.end_time)));
//       const allTexts = [];

//       for (const seg of group) {
//         const subtitles = await SubtitleModel.getSubtitlesBySegment(
//           seg.segment_id
//         );
//         allTexts.push(...subtitles.map((s) => s.text).filter(Boolean));
//       }

//       const combinedText = allTexts.join(" ").trim();
//       const cleanedText = applyDeduplication(combinedText, config.level);
//       const textSegments = smartTextSplitWithDeduplication(cleanedText, 10);
//       const groupDuration = groupEnd - groupStart;

//       textSegments.forEach((text, i) => {
//         const dur = groupDuration / textSegments.length;
//         const start = groupStart + i * dur;
//         const end = Math.min(groupEnd, start + dur);

//         srtEntries.push({
//           startTime: parseFloat(start.toFixed(3)),
//           endTime: parseFloat(end.toFixed(3)),
//           text: text.trim(),
//         });
//       });
//     }

//     let finalEntries = srtEntries;
//     if (config.level === "intermediate") {
//       finalEntries = deduplicateSrtSegments(srtEntries, config);
//     } else if (config.level === "basic" && config.enableCrossSegment) {
//       finalEntries = detectCrossSegmentDuplicates(srtEntries);
//     }

//     const resolved = resolveTimingConflicts(finalEntries);

//     const srtContent = resolved
//       .map(
//         (entry, i) =>
//           `${i + 1}\n${formatSrtTime(entry.startTime)} --> ${formatSrtTime(
//             entry.endTime
//           )}\n${entry.text}\n`
//       )
//       .join("\n");

//     return {
//       srtContent,
//       stats: {
//         originalSegments: segments.length,
//         finalEntries: resolved.length,
//         deduplicationLevel: config.level,
//         mode: "legacy",
//       },
//     };
//   }

//   throw new Error(`Mode inconnu : ${mode}`);
// }

// ============ FONCTIONS UTILITAIRES AMÉLIORÉES ============

/**
 * Création de groupes intelligents basée sur durée et chevauchement
 */
function createSmartGroups(segments, config) {
  const groups = [];
  let currentGroup = [segments[0]];

  for (let i = 1; i < segments.length; i++) {
    const current = segments[i];
    const groupStart = timeToSeconds(currentGroup[0].start_time);
    const currentStart = timeToSeconds(current.start_time);
    const lastInGroup = currentGroup[currentGroup.length - 1];
    const lastEnd = timeToSeconds(lastInGroup.end_time);

    // Critères pour créer un nouveau groupe
    const groupDurationExceeded =
      currentStart - groupStart > config.maxGroupDuration;
    const gapTooLarge = currentStart - lastEnd > config.maxOverlapGap;

    // Calcul du ratio de chevauchement avec le dernier segment du groupe
    const overlapStart = Math.max(
      currentStart,
      timeToSeconds(lastInGroup.start_time)
    );
    const overlapEnd = Math.min(timeToSeconds(current.end_time), lastEnd);
    const overlapDuration = Math.max(0, overlapEnd - overlapStart);
    const currentDuration = timeToSeconds(current.end_time) - currentStart;
    const overlapRatio =
      currentDuration > 0 ? overlapDuration / currentDuration : 0;

    if (
      groupDurationExceeded ||
      gapTooLarge ||
      overlapRatio < config.minOverlapRatio
    ) {
      // Nouveau groupe
      groups.push(currentGroup);
      currentGroup = [current];
    } else {
      // Ajouter au groupe existant
      currentGroup.push(current);
    }
  }

  groups.push(currentGroup); // N'oublie pas le dernier groupe
  return groups;
}

/**
 * Collection et fusion intelligente des textes d'un groupe
 */
async function collectAndMergeGroupTexts(group, config) {
  const textMap = new Map(); // Pour éviter les doublons exacts

  for (const segment of group) {
    const subtitles = await SubtitleModel.getSubtitlesBySegment(
      segment.segment_id
    );

    for (const subtitle of subtitles) {
      if (subtitle.text && subtitle.text.trim()) {
        const cleanText = subtitle.text.trim();
        if (!textMap.has(cleanText)) {
          textMap.set(cleanText, {
            text: cleanText,
            segment_id: segment.segment_id,
            timestamp: timeToSeconds(segment.start_time),
          });
        }
      }
    }
  }

  // Trier par timestamp pour maintenir l'ordre chronologique
  return Array.from(textMap.values()).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Traitement et déduplication des textes d'un groupe
 */
/**
 * Traitement et déduplication des textes d'un groupe
 */
function processGroupTexts(groupTexts, config) {
  // 1. Fusionner tous les textes bruts du groupe
  const allTexts = groupTexts.map((item) => item.text);
  const combinedText = allTexts.join(" ").trim();

  // 2. Appliquer la déduplication (par niveau choisi)
  const cleanedText = applyDeduplication(combinedText, config.level);

  if (!cleanedText) return [];

  // 3. Segmenter le texte de manière intelligente
  const rawSegments = smartTextSplitWithDeduplication(
    cleanedText,
    config.maxWordsPerSegment || 5 // fallback de sécurité
  );

  // 4. Nettoyage post-segmentation pour éviter les redondances
  const finalSegments = postProcessSubtitles(rawSegments);

  return finalSegments;
}

/**
 * Distribution temporelle intelligente basée sur la longueur du texte ou uniforme
 */
function distributeTextsInTime(
  textSegments,
  groupStart,
  groupEnd,
  mode = "length"
) {
  const groupDuration = groupEnd - groupStart;
  const entries = [];

  if (mode === "length") {
    // Distribution basée sur la longueur du texte
    const totalChars = textSegments.reduce((sum, text) => sum + text.length, 0);
    let currentTime = groupStart;

    textSegments.forEach((textPart, index) => {
      const textRatio = textPart.length / totalChars;
      const duration = Math.max(1.5, groupDuration * textRatio); // Minimum 1.5s par segment
      const endTime = Math.min(groupEnd, currentTime + duration);

      entries.push({
        startTime: parseFloat(currentTime.toFixed(3)),
        endTime: parseFloat(endTime.toFixed(3)),
        text: textPart,
      });

      currentTime = endTime;
    });
  } else {
    // Distribution uniforme (comportement original)
    textSegments.forEach((textPart, index) => {
      const subDuration = groupDuration / textSegments.length;
      const startTime = groupStart + index * subDuration;
      const endTime = Math.min(groupEnd, startTime + subDuration);

      entries.push({
        startTime: parseFloat(startTime.toFixed(3)),
        endTime: parseFloat(endTime.toFixed(3)),
        text: textPart,
      });
    });
  }

  return entries;
}

function postProcessSubtitles(segments) {
  const cleaned = [];
  let lastText = "";

  for (let text of segments) {
    text = text.trim();
    if (text && !lastText.endsWith(text) && !text.endsWith(lastText)) {
      cleaned.push(text);
      lastText = text;
    }
  }

  return cleaned;
}

/**
 * Résolution avancée des conflits temporels
 */
function resolveTimingConflictsAdvanced(entries) {
  const sorted = [...entries].sort((a, b) => a.startTime - b.startTime);
  const resolved = [];
  let lastEnd = 0;

  for (const entry of sorted) {
    let { startTime, endTime, text } = entry;

    // Empêche les chevauchements
    if (startTime < lastEnd) {
      startTime = lastEnd + 0.001;
      if (endTime <= startTime) {
        endTime = startTime + 1.5; // minimum duration
      }
    }

    resolved.push({ startTime, endTime, text });
    lastEnd = endTime;
  }

  return resolved;
}

/**
 * Fusion intelligente de textes avec détection de mots coupés
 * @param {string[]} allTexts - Tableau de textes à fusionner
 * @returns {string} - Texte fusionné intelligemment
 */
function intelligentTextMerge(allTexts) {
  if (!allTexts.length) return "";
  if (allTexts.length === 1) return cleanText(allTexts[0]);

  let mergedText = allTexts[0];
  let stats = { wordFusions: 0, punctuationFixes: 0 };

  for (let i = 1; i < allTexts.length; i++) {
    const currentText = allTexts[i];
    if (!currentText) continue;

    // Détecter les mots coupés
    const lastWords = mergedText.trim().split(" ");
    const lastWord = lastWords[lastWords.length - 1];
    const firstWords = currentText.trim().split(" ");
    const firstWord = firstWords[0];

    // Conditions pour détecter un mot coupé
    const isWordCut =
      lastWord &&
      firstWord &&
      lastWord.length >= 2 &&
      lastWord.length <= 6 && // Mot court suspect
      !lastWord.match(/[.!?,;:]$/) && // Pas de ponctuation finale
      firstWord.length >= 2 && // Premier mot pas trop court
      !firstWord.match(/^[A-Z]/) && // Pas une nouvelle phrase
      !firstWord.match(/^[.!?,;:]/); // Pas de ponctuation initiale

    if (isWordCut) {
      // Fusionner les mots coupés
      const fusedWord = lastWord + firstWord;
      const remainingText = firstWords.slice(1).join(" ");

      // Reconstruire le texte
      lastWords[lastWords.length - 1] = fusedWord;
      mergedText = lastWords.join(" ");

      if (remainingText) {
        mergedText += " " + remainingText;
      }

      stats.wordFusions++;
      console.log(
        `[Fusion] Mot coupé corrigé: "${lastWord}" + "${firstWord}" = "${fusedWord}"`
      );
    } else {
      // Fusion normale avec gestion intelligente de la ponctuation
      const endsWithPunctuation = mergedText.match(/[.!?;:]$/);
      const startsWithPunctuation = currentText.match(/^[.!?,;:]/);
      const startsWithCapital = currentText.match(/^[A-Z]/);

      if (endsWithPunctuation || startsWithPunctuation) {
        // Ponctuation déjà présente
        mergedText += " " + currentText;
      } else if (startsWithCapital) {
        // Nouvelle phrase - ajouter un point
        mergedText += ". " + currentText;
        stats.punctuationFixes++;
      } else {
        // Phrase continue - simple espace
        mergedText += " " + currentText;
      }
    }
  }

  return cleanText(mergedText);
}

/**
 * Nettoyage et normalisation du texte
 * @param {string} text - Texte à nettoyer
 * @returns {string} - Texte nettoyé
 */
function cleanText(text) {
  return text
    .replace(/\s+/g, " ") // Normaliser espaces multiples
    .replace(/\s+([.!?,;:])/g, "$1") // Coller ponctuation
    .replace(/([.!?])\s*([a-z])/g, "$1 $2") // Espace après ponctuation forte
    .replace(/([;:])\s*([a-z])/g, "$1 $2") // Espace après ponctuation faible
    .replace(/\.\s*\./g, ".") // Supprimer points doubles
    .replace(/,\s*,/g, ",") // Supprimer virgules doubles
    .replace(/\s+$/g, "") // Supprimer espaces finaux
    .replace(/^\s+/g, "") // Supprimer espaces initiaux
    .trim();
}

/**
 * Groupement intelligent des segments avec critères multiples
 * @param {Array} segments - Segments à grouper
 * @param {Object} config - Configuration du groupement
 * @returns {Array} - Groupes de segments
 */
function improvedGrouping(segments, config = {}) {
  const {
    maxGapSeconds = 3,
    maxGroupDuration = 15,
    maxSegmentsPerGroup = 5,
    minSegmentDuration = 0.5,
  } = config;

  if (!segments.length) return [];

  // Filtrer les segments trop courts
  const validSegments = segments.filter((segment) => {
    const duration =
      timeToSeconds(segment.end_time) - timeToSeconds(segment.start_time);
    return duration >= minSegmentDuration;
  });

  if (!validSegments.length) return [];

  const groups = [];
  let currentGroup = [validSegments[0]];

  for (let i = 1; i < validSegments.length; i++) {
    const current = validSegments[i];
    const lastInGroup = currentGroup[currentGroup.length - 1];

    const gap =
      timeToSeconds(current.start_time) - timeToSeconds(lastInGroup.end_time);
    const groupStart = timeToSeconds(currentGroup[0].start_time);
    const groupDuration = timeToSeconds(current.end_time) - groupStart;

    // Critères multiples pour le groupement
    const gapOk = gap <= maxGapSeconds;
    const durationOk = groupDuration <= maxGroupDuration;
    const countOk = currentGroup.length < maxSegmentsPerGroup;
    const noNegativeGap = gap >= -1; // Tolérer léger chevauchement

    const shouldGroup = gapOk && durationOk && countOk && noNegativeGap;

    if (shouldGroup) {
      currentGroup.push(current);
    } else {
      groups.push(currentGroup);
      currentGroup = [current];

      console.log(
        `[Groupement] Nouveau groupe créé - Raison: ${
          !gapOk
            ? `Gap trop grand (${gap.toFixed(1)}s)`
            : !durationOk
            ? `Durée trop longue (${groupDuration.toFixed(1)}s)`
            : !countOk
            ? "Trop de segments"
            : !noNegativeGap
            ? "Gap négatif"
            : "Autre"
        }`
      );
    }
  }

  groups.push(currentGroup);
  return groups;
}

/**
 * FONCTION PRINCIPALE V2 - Génération SRT groupée avec améliorations
 * @param {string} session_id - ID de session
 * @param {Object} options - Options de configuration
 * @returns {Object} - Résultat avec contenu SRT et statistiques
 */
async function generateGroupedSrtWithDeduplicationV2(session_id, options = {}) {
  console.log(`[SRT V2] 🚀 Génération améliorée pour session ${session_id}...`);

  const startTime = Date.now();
  const config = {
    ...DEDUPLICATION_CONFIG,
    ...options,
    // Nouvelles options V2
    enableIntelligentMerge: true,
    enableImprovedGrouping: true,
    logImprovements: true,
  };

  // 1. RÉCUPÉRATION ET FILTRAGE DES SEGMENTS
  let segments = await VideoSegmentModel.findManyBy({ session_id });
  segments = segments
    .filter((s) => s.start_time && s.end_time)
    .sort((a, b) => timeToSeconds(a.start_time) - timeToSeconds(b.start_time));

  if (!segments.length) {
    throw new Error("Aucun segment trouvé pour la session");
  }

  console.log(`[SRT V2] ${segments.length} segments trouvés`);

  // 2. GROUPEMENT INTELLIGENT DES SEGMENTS
  const groups = improvedGrouping(segments, {
    maxGapSeconds: config.maxGapSeconds || 3,
    maxGroupDuration: config.maxGroupDuration || 15,
    maxSegmentsPerGroup: config.maxSegmentsPerGroup || 4,
    minSegmentDuration: config.minSegmentDuration || 0.5,
  });

  console.log(
    `[SRT V2] 📦 ${groups.length} groupes créés (amélioration: ${
      segments.length - groups.length
    } fusions)`
  );

  // 3. TRAITEMENT DES GROUPES
  const srtEntries = [];
  let totalWordFusions = 0;
  let totalPunctuationFixes = 0;
  let processedGroups = 0;

  for (const [groupIndex, group] of groups.entries()) {
    const groupStart = Math.min(
      ...group.map((s) => timeToSeconds(s.start_time))
    );
    const groupEnd = Math.max(...group.map((s) => timeToSeconds(s.end_time)));
    const groupDuration = groupEnd - groupStart;

    console.log(
      `[SRT V2] Traitement groupe ${groupIndex + 1}/${groups.length} ` +
        `(${group.length} segments, ${groupDuration.toFixed(1)}s)`
    );

    // Récupérer tous les sous-titres du groupe
    const allTexts = [];
    for (const segment of group) {
      try {
        const subtitles = await SubtitleModel.getSubtitlesBySegment(
          segment.segment_id
        );
        const segmentTexts = subtitles
          .map((s) => s.text)
          .filter(Boolean)
          .filter((text) => text.trim().length > 0);

        allTexts.push(...segmentTexts);
      } catch (error) {
        console.warn(
          `[SRT V2] Erreur récupération segment ${segment.segment_id}:`,
          error.message
        );
      }
    }

    if (allTexts.length === 0) {
      console.log(`[SRT V2] ⚠️ Groupe ${groupIndex + 1} ignoré (aucun texte)`);
      continue;
    }

    // 4. FUSION INTELLIGENTE DES TEXTES
    const combinedText = config.enableIntelligentMerge
      ? intelligentTextMerge(allTexts)
      : allTexts.join(" ").trim();

    // 5. DÉDUPLICATION
    const cleanedText = applyDeduplication(combinedText, config.level);

    if (!cleanedText || cleanedText.trim().length === 0) {
      console.log(
        `[SRT V2] ⚠️ Groupe ${
          groupIndex + 1
        } ignoré (texte vide après déduplication)`
      );
      continue;
    }

    // 6. DIVISION EN SEGMENTS TEMPORELS
    const textSegments = smartTextSplitWithDeduplication(cleanedText, 10);

    if (textSegments.length === 0) {
      console.log(
        `[SRT V2] ⚠️ Groupe ${
          groupIndex + 1
        } ignoré (aucun segment après division)`
      );
      continue;
    }

    // 7. DISTRIBUTION TEMPORELLE
    textSegments.forEach((textPart, index) => {
      const subDuration = groupDuration / textSegments.length;
      const startTime = groupStart + index * subDuration;
      const endTime = Math.min(groupEnd, startTime + subDuration);

      // Validation des timings
      if (endTime > startTime && textPart.trim().length > 0) {
        srtEntries.push({
          startTime: parseFloat(startTime.toFixed(3)),
          endTime: parseFloat(endTime.toFixed(3)),
          text: textPart.trim(),
          groupIndex: groupIndex,
          segmentIndex: index,
        });
      }
    });

    processedGroups++;
  }

  console.log(
    `[SRT V2] ✅ ${processedGroups}/${groups.length} groupes traités avec succès`
  );
  console.log(`[SRT V2] 📝 ${srtEntries.length} entrées SRT générées`);

  // 8. DÉDUPLICATION CROSS-SEGMENT
  let finalEntries = srtEntries;

  if (config.level === "intermediate") {
    console.log(`[SRT V2] 🔄 Déduplication intermédiaire...`);
    finalEntries = deduplicateSrtSegments(srtEntries, config);
  } else if (config.level === "basic" && config.enableCrossSegment) {
    console.log(`[SRT V2] 🔄 Déduplication basique cross-segment...`);
    finalEntries = detectCrossSegmentDuplicates(srtEntries);
  }

  // 9. RÉSOLUTION DES CONFLITS TEMPORELS
  console.log(`[SRT V2] ⚡ Résolution des conflits temporels...`);
  const resolvedEntries = resolveTimingConflicts(finalEntries);

  // 10. GÉNÉRATION DU CONTENU SRT FINAL
  const srtContent = resolvedEntries
    .map((entry, index) => {
      return `${index + 1}\n${formatSrtTime(
        entry.startTime
      )} --> ${formatSrtTime(entry.endTime)}\n${entry.text}\n`;
    })
    .join("\n");

  const processingTime = Date.now() - startTime;

  // 11. STATISTIQUES DÉTAILLÉES
  const stats = {
    // Statistiques originales
    groups: groups.length,
    originalEntries: srtEntries.length,
    deduplicatedEntries: finalEntries.length,
    finalEntries: resolvedEntries.length,
    deduplicationLevel: config.level,

    // Nouvelles statistiques V2
    processedGroups,
    skippedGroups: groups.length - processedGroups,
    averageGroupSize:
      groups.reduce((sum, g) => sum + g.length, 0) / groups.length,
    totalWordFusions,
    totalPunctuationFixes,
    processingTimeMs: processingTime,
    version: "2.0",

    // Métriques de qualité
    textQualityScore: calculateTextQuality(resolvedEntries),
    averageEntryDuration:
      resolvedEntries.reduce((sum, e) => sum + (e.endTime - e.startTime), 0) /
      resolvedEntries.length,

    // Configuration utilisée
    config: {
      maxGapSeconds: config.maxGapSeconds || 3,
      maxGroupDuration: config.maxGroupDuration || 15,
      maxSegmentsPerGroup: config.maxSegmentsPerGroup || 4,
      enableIntelligentMerge: config.enableIntelligentMerge,
      enableImprovedGrouping: config.enableImprovedGrouping,
    },
  };

  // 12. LOG FINAL
  console.log(`[SRT V2] 🎉 Génération terminée en ${processingTime}ms`);
  console.log(
    `[SRT V2] 📊 Qualité du texte: ${(stats.textQualityScore * 100).toFixed(
      1
    )}%`
  );
  console.log(`[SRT V2] 💾 ${resolvedEntries.length} entrées finales générées`);

  return {
    srtContent,
    stats,
    success: true,
    version: "2.0",
  };
}

/**
 * Calcul simple de qualité du texte
 * @param {Array} entries - Entrées SRT
 * @returns {number} - Score de qualité (0-1)
 */
function calculateTextQuality(entries) {
  if (!entries.length) return 0;

  let qualityScore = 0;
  const factors = {
    hasProperPunctuation: 0,
    hasReasonableLength: 0,
    hasNoRepeatedWords: 0,
    hasProperCapitalization: 0,
  };

  entries.forEach((entry) => {
    const text = entry.text;

    // Ponctuation appropriée
    if (text.match(/[.!?]$/) || text.length < 50) {
      factors.hasProperPunctuation++;
    }

    // Longueur raisonnable
    if (text.length >= 10 && text.length <= 120) {
      factors.hasReasonableLength++;
    }

    // Pas de mots répétés consécutifs
    const words = text.toLowerCase().split(" ");
    let hasRepeats = false;
    for (let i = 1; i < words.length; i++) {
      if (words[i] === words[i - 1] && words[i].length > 3) {
        hasRepeats = true;
        break;
      }
    }
    if (!hasRepeats) {
      factors.hasNoRepeatedWords++;
    }

    // Capitalisation appropriée
    if (text.match(/^[A-Z]/) || text.match(/^\d/)) {
      factors.hasProperCapitalization++;
    }
  });

  // Calcul du score moyen
  const totalFactors = Object.keys(factors).length;
  qualityScore =
    Object.values(factors).reduce(
      (sum, count) => sum + count / entries.length,
      0
    ) / totalFactors;

  return Math.max(0, Math.min(1, qualityScore));
}

// EXPORT DE LA FONCTION
module.exports = {
  generateGroupedSrtWithDeduplicationV2,
  intelligentTextMerge,
  improvedGrouping,
  cleanText,
  calculateTextQuality,
};

async function exportGroupedSrtWithDeduplicationController(req, res) {
  const { session_id } = req.params;
  const { level = "intermediate", windowSize = 5, threshold = 0.7 } = req.query;

  try {
    const options = {
      level,
      windowSize: parseInt(windowSize),
      threshold: parseFloat(threshold),
    };

    const result = await generateGroupedSrtWithDeduplication(
      session_id,
      options
    );

    const fs = require("fs");
    const path = require("path");

    const filePath = path.join(
      __dirname,
      `../../../srt_exports/session_${session_id}_grouped_dedup_${level}.srt`
    );

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, result.srtContent, "utf8");
    console.log(`[Grouped SRT + Dedup] Fichier sauvegardé : ${filePath}`);
    console.log(`[Stats] ${JSON.stringify(result.stats, null, 2)}`);

    return res.download(filePath);
  } catch (error) {
    console.error("❌ Erreur export SRT groupé avec déduplication :", error);
    return res.status(500).json({
      message: "Erreur lors de la génération du SRT groupé avec déduplication",
      error: error.message,
    });
  }
}

/**
 * Pipeline principal avec déduplication ET correction LanguageTool
 */
async function generateCorrectedSrtWithDeduplication(session_id, options = {}) {
  console.log(
    `[SRT + LanguageTool + Dedup] Génération pour session ${session_id}...`
  );

  // Merger les options avec les configs par défaut
  const dedupConfig = { ...DEDUPLICATION_CONFIG, ...options.deduplication };
  const langConfig = { ...LANGUAGETOOL_CONFIG, ...options.languageTool };

  // 1. Récupérer les segments vidéo
  let segments = await VideoSegmentModel.findManyBy({ session_id });

  segments = segments
    .filter((s) => s.start_time && s.end_time)
    .sort((a, b) => timeToSeconds(a.start_time) - timeToSeconds(b.start_time));

  if (!segments.length) {
    throw new Error("Aucun segment trouvé pour cette session");
  }

  console.log(
    `[SRT + LanguageTool + Dedup] ${segments.length} segments récupérés`
  );

  // 2. Traiter chaque segment avec déduplication ET correction
  const srtEntries = [];
  let correctionStats = {
    totalTexts: 0,
    correctedTexts: 0,
    errors: 0,
  };

  for (const segment of segments) {
    try {
      const subtitles = await SubtitleModel.getSubtitlesBySegment(
        segment.segment_id
      );

      if (subtitles.length === 0) {
        console.log(
          `[SRT + LanguageTool] ⚠️ Aucun sous-titre pour segment ${segment.segment_id}`
        );
        continue;
      }

      // Combiner tous les sous-titres du segment
      const fullText = subtitles
        .map((s) => s.text)
        .filter(Boolean)
        .join(" ")
        .trim();

      if (!fullText) continue;

      correctionStats.totalTexts++;

      // Découper avec déduplication ET correction intégrées
      const textSegments = await smartTextSplitWithCorrectionAndDeduplication(
        fullText,
        8,
        langConfig.defaultLanguage
      );

      if (textSegments.length > 0) {
        correctionStats.correctedTexts++;
      }

      const segmentStart = timeToSeconds(segment.start_time);
      const segmentEnd = timeToSeconds(segment.end_time);
      const segmentDuration = segmentEnd - segmentStart;

      // Distribuer les sous-segments
      textSegments.forEach((textPart, index) => {
        const subSegmentDuration = segmentDuration / textSegments.length;
        const startTime = segmentStart + index * subSegmentDuration;
        const endTime = startTime + subSegmentDuration;

        srtEntries.push({
          startTime: parseFloat(startTime.toFixed(3)),
          endTime: parseFloat(endTime.toFixed(3)),
          text: textPart,
        });
      });
    } catch (error) {
      console.error(
        `[SRT + LanguageTool] Erreur segment ${segment.segment_id}: ${error.message}`
      );
      correctionStats.errors++;

      // En cas d'erreur, traiter le segment sans correction
      const subtitles = await SubtitleModel.getSubtitlesBySegment(
        segment.segment_id
      );

      if (subtitles.length > 0) {
        const fullText = subtitles
          .map((s) => s.text)
          .filter(Boolean)
          .join(" ")
          .trim();

        if (fullText) {
          const textSegments = smartTextSplitWithDeduplication(fullText, 8);

          const segmentStart = timeToSeconds(segment.start_time);
          const segmentEnd = timeToSeconds(segment.end_time);
          const segmentDuration = segmentEnd - segmentStart;

          textSegments.forEach((textPart, index) => {
            const subSegmentDuration = segmentDuration / textSegments.length;
            const startTime = segmentStart + index * subSegmentDuration;
            const endTime = startTime + subSegmentDuration;

            srtEntries.push({
              startTime: parseFloat(startTime.toFixed(3)),
              endTime: parseFloat(endTime.toFixed(3)),
              text: textPart,
            });
          });
        }
      }
    }
  }

  console.log(
    `[SRT + LanguageTool] ${srtEntries.length} entrées avant déduplication cross-segment`
  );

  // 3. Déduplication cross-segment selon configuration
  let finalEntries = srtEntries;

  if (dedupConfig.level === "intermediate") {
    finalEntries = deduplicateSrtSegments(srtEntries, dedupConfig);
  } else if (dedupConfig.level === "basic" && dedupConfig.enableCrossSegment) {
    finalEntries = detectCrossSegmentDuplicates(srtEntries);
  }

  console.log(
    `[SRT + LanguageTool] ${finalEntries.length} entrées après déduplication cross-segment`
  );

  // 4. Résoudre les conflits de timing
  const resolvedEntries = resolveTimingConflicts(finalEntries);

  // 5. Générer le fichier SRT final
  const srtContent = resolvedEntries
    .map((entry, index) => {
      return `${index + 1}\n${formatSrtTime(
        entry.startTime
      )} --> ${formatSrtTime(entry.endTime)}\n${entry.text}\n`;
    })
    .join("\n");

  console.log(
    `[SRT + LanguageTool + Dedup] ✅ ${resolvedEntries.length} entrées SRT générées avec correction et déduplication`
  );

  return {
    srtContent,
    stats: {
      originalEntries: srtEntries.length,
      deduplicatedEntries: finalEntries.length,
      finalEntries: resolvedEntries.length,
      deduplicationLevel: dedupConfig.level,
      correction: correctionStats,
      languageUsed: langConfig.defaultLanguage,
    },
  };
}

/**
 * Controller Express avec LanguageTool
 */
async function exportCorrectedSrtController(req, res) {
  const { session_id } = req.params;
  const {
    level = "intermediate",
    windowSize = 5,
    threshold = 0.7,
    language = "fr",
    enableCorrection = "true",
  } = req.query;

  try {
    const options = {
      deduplication: {
        level,
        windowSize: parseInt(windowSize),
        threshold: parseFloat(threshold),
      },
      languageTool: {
        enabled: enableCorrection === "true",
        defaultLanguage: language,
      },
    };

    const result = await generateCorrectedSrtWithDeduplication(
      session_id,
      options
    );

    const fs = require("fs");
    const path = require("path");

    const correctionSuffix = options.languageTool.enabled ? "_corrected" : "";
    const filePath = path.join(
      __dirname,
      `../../../srt_exports/session_${session_id}_dedup_${level}${correctionSuffix}.srt`
    );

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, result.srtContent, "utf8");
    console.log(
      `[SRT + LanguageTool + Dedup] Fichier sauvegardé : ${filePath}`
    );
    console.log(`[Stats] ${JSON.stringify(result.stats, null, 2)}`);

    return res.download(filePath);
  } catch (error) {
    console.error(
      "❌ Erreur export SRT avec correction et déduplication :",
      error
    );
    return res.status(500).json({
      message:
        "Erreur lors de la génération du SRT avec correction et déduplication",
      error: error.message,
    });
  }
}

/**
 * Version de fallback sans correction en cas de problème avec LanguageTool
 */
async function generateSafeDeduplicatedSrt(session_id, options = {}) {
  console.log(
    `[Safe SRT + Dedup] Génération sécurisée pour session ${session_id}...`
  );

  const config = { ...DEDUPLICATION_CONFIG, ...options };

  let segments = await VideoSegmentModel.findManyBy({ session_id });

  segments = segments
    .filter((s) => s.start_time && s.end_time)
    .sort((a, b) => timeToSeconds(a.start_time) - timeToSeconds(b.start_time));

  if (!segments.length) {
    throw new Error("Aucun segment trouvé pour cette session");
  }

  const srtEntries = [];

  for (const segment of segments) {
    const subtitles = await SubtitleModel.getSubtitlesBySegment(
      segment.segment_id
    );

    if (subtitles.length === 0) continue;

    const fullText = subtitles
      .map((s) => s.text)
      .filter(Boolean)
      .join(" ")
      .trim();

    if (!fullText) continue;

    // Utiliser seulement la déduplication sans correction
    const textSegments = smartTextSplitWithDeduplication(fullText);

    const segmentStart = timeToSeconds(segment.start_time);
    const segmentEnd = timeToSeconds(segment.end_time);
    const segmentDuration = segmentEnd - segmentStart;

    textSegments.forEach((textPart, index) => {
      const subSegmentDuration = segmentDuration / textSegments.length;
      const startTime = segmentStart + index * subSegmentDuration;
      const endTime = startTime + subSegmentDuration;

      srtEntries.push({
        startTime: parseFloat(startTime.toFixed(3)),
        endTime: parseFloat(endTime.toFixed(3)),
        text: textPart,
      });
    });
  }

  let finalEntries = srtEntries;

  if (config.level === "intermediate") {
    finalEntries = deduplicateSrtSegments(srtEntries, config);
  } else if (config.level === "basic" && config.enableCrossSegment) {
    finalEntries = detectCrossSegmentDuplicates(srtEntries);
  }

  const resolvedEntries = resolveTimingConflicts(finalEntries);

  const srtContent = resolvedEntries
    .map((entry, index) => {
      return `${index + 1}\n${formatSrtTime(
        entry.startTime
      )} --> ${formatSrtTime(entry.endTime)}\n${entry.text}\n`;
    })
    .join("\n");

  return {
    srtContent,
    stats: {
      originalEntries: srtEntries.length,
      deduplicatedEntries: finalEntries.length,
      finalEntries: resolvedEntries.length,
      deduplicationLevel: config.level,
      correction: { enabled: false },
    },
  };
}

// Configuration des contraintes de qualité SRT avec fallback
const SRT_QUALITY_CONFIG = {
  minDuration: 1.0,
  maxDuration: 6.0,
  maxLineLength: 35,
  maxCPS: 20,
  defaultMaxChars: 40,
  // Nouvelles options de fallback
  fallback: {
    enabled: true,
    relaxedCPS: 35, // CPS plus permissif en fallback
    maxRelaxedDuration: 8.0, // Durée max étendue en fallback
    minSegmentLength: 20, // Longueur minimale pour conserver un segment
  },
};

/**
 * Découpe un texte en lignes sans couper les mots
 */
function wrapTextLines(text, maxLength = SRT_QUALITY_CONFIG.defaultMaxChars) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (testLine.length <= maxLength) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Mot trop long, on le coupe quand même
        lines.push(word);
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Calcule la durée optimale pour un texte selon les contraintes CPS
 */
function calculateOptimalDuration(text, useFallback = false) {
  const charCount = text.length;
  const maxCPS = useFallback
    ? SRT_QUALITY_CONFIG.fallback.relaxedCPS
    : SRT_QUALITY_CONFIG.maxCPS;
  const maxDuration = useFallback
    ? SRT_QUALITY_CONFIG.fallback.maxRelaxedDuration
    : SRT_QUALITY_CONFIG.maxDuration;

  const minDurationByCPS = charCount / maxCPS;

  return Math.max(
    SRT_QUALITY_CONFIG.minDuration,
    Math.min(maxDuration, minDurationByCPS)
  );
}

/**
 * Tente de diviser intelligemment un texte trop long
 */
function smartSplitLongText(text, availableDuration) {
  // Essayer de couper aux points de ponctuation naturels
  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length > 1) {
    const midPoint = Math.floor(sentences.length / 2);
    const firstHalf = sentences.slice(0, midPoint).join(" ");
    const secondHalf = sentences.slice(midPoint).join(" ");

    return [
      { text: firstHalf, duration: availableDuration * 0.5 },
      { text: secondHalf, duration: availableDuration * 0.5 },
    ];
  }

  // Si pas de phrases, couper aux virgules
  const clauses = text.split(/,\s+/);
  if (clauses.length > 1) {
    const midPoint = Math.floor(clauses.length / 2);
    const firstHalf = clauses.slice(0, midPoint).join(", ");
    const secondHalf = clauses.slice(midPoint).join(", ");

    return [
      { text: firstHalf, duration: availableDuration * 0.5 },
      { text: secondHalf, duration: availableDuration * 0.5 },
    ];
  }

  // En dernier recours, couper au milieu
  const words = text.split(" ");
  const midPoint = Math.floor(words.length / 2);
  const firstHalf = words.slice(0, midPoint).join(" ");
  const secondHalf = words.slice(midPoint).join(" ");

  return [
    { text: firstHalf, duration: availableDuration * 0.5 },
    { text: secondHalf, duration: availableDuration * 0.5 },
  ];
}

/**
 * Divise un texte long en segments respectant les contraintes
 */
function splitTextForQuality(text, availableDuration, useFallback = false) {
  const lines = wrapTextLines(text, SRT_QUALITY_CONFIG.maxLineLength);
  const fullText = lines.join("\n");

  // Si le texte respecte déjà les contraintes
  const optimalDuration = calculateOptimalDuration(fullText, useFallback);
  if (optimalDuration <= availableDuration) {
    return [
      {
        text: fullText,
        duration: Math.max(optimalDuration, SRT_QUALITY_CONFIG.minDuration),
      },
    ];
  }

  // Si même en fallback ça ne passe pas, essayer la division intelligente
  if (useFallback) {
    return smartSplitLongText(fullText, availableDuration);
  }

  // Sinon, diviser le texte normalement
  const segments = [];
  let currentSegment = [];
  let currentCharCount = 0;

  for (const line of lines) {
    const testCharCount =
      currentCharCount + line.length + (currentSegment.length > 0 ? 1 : 0);
    const testDuration = calculateOptimalDuration(
      currentSegment.concat(line).join("\n"),
      useFallback
    );

    const maxDuration = useFallback
      ? SRT_QUALITY_CONFIG.fallback.maxRelaxedDuration
      : SRT_QUALITY_CONFIG.maxDuration;

    if (testDuration <= maxDuration && currentSegment.length < 2) {
      currentSegment.push(line);
      currentCharCount = testCharCount;
    } else {
      if (currentSegment.length > 0) {
        const segmentText = currentSegment.join("\n");
        segments.push({
          text: segmentText,
          duration: Math.max(
            calculateOptimalDuration(segmentText, useFallback),
            SRT_QUALITY_CONFIG.minDuration
          ),
        });
      }
      currentSegment = [line];
      currentCharCount = line.length;
    }
  }

  if (currentSegment.length > 0) {
    const segmentText = currentSegment.join("\n");
    segments.push({
      text: segmentText,
      duration: Math.max(
        calculateOptimalDuration(segmentText, useFallback),
        SRT_QUALITY_CONFIG.minDuration
      ),
    });
  }

  return segments;
}

/**
 * Applique les contraintes de qualité avec système de fallback
 */
function applyQualityConstraints(srtEntries) {
  const qualityEntries = [];
  const rejectedEntries = [];

  for (const entry of srtEntries) {
    const availableDuration = entry.endTime - entry.startTime;

    // Première tentative avec contraintes strictes
    let textSegments = splitTextForQuality(
      entry.text,
      availableDuration,
      false
    );
    let usedFallback = false;

    // Si aucun segment ne respecte les contraintes strictes, essayer le fallback
    if (SRT_QUALITY_CONFIG.fallback.enabled) {
      const allSegmentsValid = textSegments.every((segment) => {
        const cps = segment.text.length / segment.duration;
        return (
          cps <= SRT_QUALITY_CONFIG.maxCPS &&
          segment.duration <= SRT_QUALITY_CONFIG.maxDuration
        );
      });

      if (!allSegmentsValid) {
        console.log(
          `[Quality] Tentative fallback pour entrée de ${entry.text.length} caractères`
        );
        textSegments = splitTextForQuality(entry.text, availableDuration, true);
        usedFallback = true;
      }
    }

    if (textSegments.length === 1) {
      // Un seul segment
      const segment = textSegments[0];
      const newEndTime = entry.startTime + segment.duration;

      qualityEntries.push({
        startTime: entry.startTime,
        endTime: newEndTime,
        text: segment.text,
        usedFallback,
      });
    } else {
      // Plusieurs segments, les distribuer dans le temps disponible
      const totalRequestedDuration = textSegments.reduce(
        (sum, seg) => sum + seg.duration,
        0
      );
      const scaleFactor = availableDuration / totalRequestedDuration;

      let currentStart = entry.startTime;

      for (let i = 0; i < textSegments.length; i++) {
        const segment = textSegments[i];
        const adjustedDuration = Math.max(
          segment.duration * scaleFactor,
          SRT_QUALITY_CONFIG.minDuration
        );

        const endTime = Math.min(
          currentStart + adjustedDuration,
          entry.endTime
        );

        qualityEntries.push({
          startTime: currentStart,
          endTime: endTime,
          text: segment.text,
          usedFallback,
        });

        currentStart = endTime;

        if (currentStart >= entry.endTime) break;
      }
    }
  }

  return { qualityEntries, rejectedEntries };
}

/**
 * Validation avec système de fallback plus permissif
 */
function validateWithFallback(entries) {
  const validatedEntries = [];
  const rejectedEntries = [];

  for (const entry of entries) {
    const duration = entry.endTime - entry.startTime;
    const cps = entry.text.length / duration;

    // Contraintes strictes
    const strictValid =
      duration >= SRT_QUALITY_CONFIG.minDuration &&
      duration <= SRT_QUALITY_CONFIG.maxDuration &&
      cps <= SRT_QUALITY_CONFIG.maxCPS;

    // Contraintes fallback
    const fallbackValid =
      SRT_QUALITY_CONFIG.fallback.enabled &&
      duration >= SRT_QUALITY_CONFIG.minDuration &&
      duration <= SRT_QUALITY_CONFIG.fallback.maxRelaxedDuration &&
      cps <= SRT_QUALITY_CONFIG.fallback.relaxedCPS &&
      entry.text.length >= SRT_QUALITY_CONFIG.fallback.minSegmentLength;

    if (strictValid) {
      validatedEntries.push({ ...entry, qualityLevel: "strict" });
    } else if (fallbackValid) {
      console.log(
        `[Quality] Entrée acceptée en fallback - Durée: ${duration.toFixed(
          1
        )}s, CPS: ${cps.toFixed(1)}`
      );
      validatedEntries.push({ ...entry, qualityLevel: "fallback" });
    } else {
      console.warn(
        `[Quality] Entrée rejetée - Durée: ${duration.toFixed(
          1
        )}s, CPS: ${cps.toFixed(1)}, Longueur: ${entry.text.length}`
      );
      rejectedEntries.push(entry);
    }
  }

  return { validatedEntries, rejectedEntries };
}

/**
 * Résout les conflits de timing après application des contraintes
 */
function resolveQualityTimingConflicts(entries) {
  if (entries.length <= 1) return entries;

  const resolved = [entries[0]];

  for (let i = 1; i < entries.length; i++) {
    const current = { ...entries[i] };
    const previous = resolved[resolved.length - 1];

    if (current.startTime < previous.endTime) {
      const gap = 0.1;
      current.startTime = previous.endTime + gap;

      const newDuration = current.endTime - current.startTime;
      if (newDuration < SRT_QUALITY_CONFIG.minDuration) {
        current.endTime = current.startTime + SRT_QUALITY_CONFIG.minDuration;
      }
    }

    resolved.push(current);
  }

  return resolved;
}

// Fonction principale modifiée
async function generateGroupedSrtWithQualityConstraints(
  session_id,
  options = {}
) {
  console.log(
    `[Grouped SRT + Quality] Génération avec contraintes de qualité pour session ${session_id}...`
  );

  const config = { ...DEDUPLICATION_CONFIG, ...options };
  let segments = await VideoSegmentModel.findManyBy({ session_id });
  segments = segments
    .filter((s) => s.start_time && s.end_time)
    .sort((a, b) => timeToSeconds(a.start_time) - timeToSeconds(b.start_time));

  if (!segments.length) {
    throw new Error("Aucun segment trouvé");
  }

  // Grouper les segments qui se chevauchent
  const groups = [];
  let currentGroup = [segments[0]];

  for (let i = 1; i < segments.length; i++) {
    const lastInGroup = currentGroup[currentGroup.length - 1];
    const current = segments[i];
    const lastEnd = timeToSeconds(lastInGroup.end_time);
    const currentStart = timeToSeconds(current.start_time);

    if (currentStart <= lastEnd + 2) {
      currentGroup.push(current);
    } else {
      groups.push(currentGroup);
      currentGroup = [current];
    }
  }
  groups.push(currentGroup);

  console.log(`[Grouped SRT + Quality] ${groups.length} groupes créés`);

  const srtEntries = [];
  for (const group of groups) {
    const groupStart = Math.min(
      ...group.map((s) => timeToSeconds(s.start_time))
    );
    const groupEnd = Math.max(...group.map((s) => timeToSeconds(s.end_time)));

    const allTexts = [];
    for (const segment of group) {
      const subtitles = await SubtitleModel.getSubtitlesBySegment(
        segment.segment_id
      );
      allTexts.push(...subtitles.map((s) => s.text).filter(Boolean));
    }

    if (allTexts.length === 0) continue;

    const combinedText = allTexts.join(" ").trim();
    const cleanedText = applyDeduplication(combinedText, config.level);

    if (!cleanedText) continue;

    // Utiliser la même logique de division que le mode grouped de base
    const textSegments = smartTextSplitWithDeduplication(cleanedText, 10);
    const groupDuration = groupEnd - groupStart;

    // Distribuer les segments dans le temps du groupe
    textSegments.forEach((textPart, index) => {
      const subDuration = groupDuration / textSegments.length;
      const startTime = groupStart + index * subDuration;
      const endTime = Math.min(groupEnd, startTime + subDuration);

      srtEntries.push({
        startTime: parseFloat(startTime.toFixed(3)),
        endTime: parseFloat(endTime.toFixed(3)),
        text: textPart,
      });
    });
  }

  console.log(
    `[Grouped Quality] ${srtEntries.length} entrées avant contraintes de qualité`
  );

  // Maintenant appliquer les contraintes de qualité sur les segments déjà divisés
  const qualityEntries = [];
  const rejectedEntries = [];

  for (const entry of srtEntries) {
    const duration = entry.endTime - entry.startTime;
    const cps = entry.text.length / duration;

    // Vérifier si l'entrée respecte les contraintes strictes
    const strictValid =
      duration >= SRT_QUALITY_CONFIG.minDuration &&
      duration <= SRT_QUALITY_CONFIG.maxDuration &&
      cps <= SRT_QUALITY_CONFIG.maxCPS;

    // Vérifier si l'entrée respecte les contraintes fallback
    const fallbackValid =
      SRT_QUALITY_CONFIG.fallback.enabled &&
      duration >= SRT_QUALITY_CONFIG.minDuration &&
      duration <= SRT_QUALITY_CONFIG.fallback.maxRelaxedDuration &&
      cps <= SRT_QUALITY_CONFIG.fallback.relaxedCPS &&
      entry.text.length >= SRT_QUALITY_CONFIG.fallback.minSegmentLength;

    if (strictValid) {
      qualityEntries.push({ ...entry, qualityLevel: "strict" });
    } else if (fallbackValid) {
      console.log(
        `[Quality] Entrée acceptée en fallback - Durée: ${duration.toFixed(
          1
        )}s, CPS: ${cps.toFixed(1)}`
      );
      qualityEntries.push({ ...entry, qualityLevel: "fallback" });
    } else {
      // Si l'entrée ne passe toujours pas, essayer de la rediviser
      const availableDuration = entry.endTime - entry.startTime;
      const textSegments = splitTextForQuality(
        entry.text,
        availableDuration,
        true
      );

      if (textSegments.length > 1) {
        // Redistribuer les sous-segments dans le temps
        let currentStart = entry.startTime;
        const totalDuration = entry.endTime - entry.startTime;
        const segmentDuration = totalDuration / textSegments.length;

        for (const segment of textSegments) {
          const segmentEndTime = Math.min(
            currentStart + segmentDuration,
            entry.endTime
          );
          const segmentCPS =
            segment.text.length / (segmentEndTime - currentStart);

          if (segmentCPS <= SRT_QUALITY_CONFIG.fallback.relaxedCPS) {
            qualityEntries.push({
              startTime: currentStart,
              endTime: segmentEndTime,
              text: segment.text,
              qualityLevel: "subdivided",
            });
          }

          currentStart = segmentEndTime;
        }
      } else {
        console.warn(
          `[Quality] Entrée rejetée - Durée: ${duration.toFixed(
            1
          )}s, CPS: ${cps.toFixed(1)}, Longueur: ${entry.text.length}`
        );
        rejectedEntries.push(entry);
      }
    }
  }

  console.log(
    `[Grouped Quality] ${qualityEntries.length} entrées après contraintes de qualité`
  );

  // Déduplication cross-segment
  let finalEntries = qualityEntries;
  if (config.level === "intermediate") {
    finalEntries = deduplicateSrtSegments(qualityEntries, config);
  } else if (config.level === "basic" && config.enableCrossSegment) {
    finalEntries = detectCrossSegmentDuplicates(qualityEntries);
  }

  console.log(
    `[Grouped Quality] ${finalEntries.length} entrées après déduplication cross-segment`
  );

  // Résoudre les conflits de timing
  const resolvedEntries = resolveQualityTimingConflicts(qualityEntries);

  // Si aucune entrée validée et qu'on a des rejets, créer une version de secours
  if (resolvedEntries.length === 0 && rejectedEntries.length > 0) {
    console.log(
      `[Quality] Aucune entrée validée, création d'une version de secours`
    );

    for (const rejectedEntry of rejectedEntries) {
      const words = rejectedEntry.text.split(" ");
      const maxWordsPerSegment = Math.max(3, Math.floor(words.length / 4));

      let currentStart = rejectedEntry.startTime;
      const totalDuration = rejectedEntry.endTime - rejectedEntry.startTime;
      const numSegments = Math.ceil(words.length / maxWordsPerSegment);
      const segmentDuration = totalDuration / numSegments;

      for (let i = 0; i < words.length; i += maxWordsPerSegment) {
        const segmentWords = words.slice(i, i + maxWordsPerSegment);
        const segmentText = segmentWords.join(" ");

        resolvedEntries.push({
          startTime: currentStart,
          endTime: Math.min(
            currentStart + segmentDuration,
            rejectedEntry.endTime
          ),
          text: segmentText,
          qualityLevel: "emergency",
        });

        currentStart += segmentDuration;
      }
    }

    console.log(
      `[Quality] ${resolvedEntries.length} entrées de secours créées`
    );
  }

  const srtContent = resolvedEntries
    .map((entry, index) => {
      return `${index + 1}\n${formatSrtTime(
        entry.startTime
      )} --> ${formatSrtTime(entry.endTime)}\n${entry.text}\n`;
    })
    .join("\n");

  console.log(
    `[Grouped SRT + Quality] ✅ ${resolvedEntries.length} entrées SRT générées avec contraintes de qualité`
  );

  return {
    srtContent,
    stats: {
      groups: groups.length,
      originalEntries: srtEntries.length,
      qualityEntries: qualityEntries.length,
      deduplicatedEntries: finalEntries.length,
      finalEntries: resolvedEntries.length,
      rejectedEntries: rejectedEntries.length,
      qualityLevels: {
        strict: resolvedEntries.filter((e) => e.qualityLevel === "strict")
          .length,
        fallback: resolvedEntries.filter((e) => e.qualityLevel === "fallback")
          .length,
        subdivided: resolvedEntries.filter(
          (e) => e.qualityLevel === "subdivided"
        ).length,
        emergency: resolvedEntries.filter((e) => e.qualityLevel === "emergency")
          .length,
      },
      deduplicationLevel: config.level,
      qualityConstraints: SRT_QUALITY_CONFIG,
    },
  };
}

module.exports = {
  generateImprovedSrtWithDeduplication,
  exportImprovedSrtWithDeduplicationController,
  smartTextSplitWithDeduplication,
  applyDeduplication,
  DEDUPLICATION_CONFIG,
  LANGUAGETOOL_CONFIG,
  SRT_QUALITY_CONFIG,
  splitTextForQuality,
  deduplicateSrtSegments,
  detectCrossSegmentDuplicates,
  resolveQualityTimingConflicts,
  formatSrtTime,
  resolveTimingConflicts,
  generateGroupedSrtWithDeduplication,
  exportGroupedSrtWithDeduplicationController,
  generateCorrectedSrtWithDeduplication,
  exportCorrectedSrtController,
  correctTextWithLanguageTool,
  correctTextsBatch,
  correctLongText,
  applyCorrections,
  smartTextSplitWithCorrectionAndDeduplication,
  generateSafeDeduplicatedSrt,
  generateGroupedSrtWithQualityConstraints,
};
