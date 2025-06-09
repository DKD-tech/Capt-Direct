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

module.exports = {
  generateImprovedSrtWithDeduplication,
  exportImprovedSrtWithDeduplicationController,
  smartTextSplitWithDeduplication,
  applyDeduplication,
  DEDUPLICATION_CONFIG,
  LANGUAGETOOL_CONFIG,
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
};
