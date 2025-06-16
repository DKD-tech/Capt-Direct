const VideoSegmentModel = require("../../models/VideoSegmentModel");
const SubtitleModel = require("../../models/SubtitleModel");
const {
  processSubtitlesWithDeduplication,
} = require("../stc/subtitleDeduplicator");
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
 * Découpe intelligemment un texte long en segments de taille raisonnable
 */
function smartTextSplit(text, maxWordsPerSegment = 8) {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim());
  const segments = [];

  let currentSegment = "";
  let wordCount = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.trim().split(/\s+/).length;

    // Si ajouter cette phrase dépasse la limite ET qu'on a déjà du contenu
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

  // Si on n'a qu'un segment mais qu'il est trop long, on force le découpage par mots
  if (segments.length === 1 && wordCount > maxWordsPerSegment) {
    const words = text.trim().split(/\s+/);
    const forcedSegments = [];

    for (let i = 0; i < words.length; i += maxWordsPerSegment) {
      forcedSegments.push(words.slice(i, i + maxWordsPerSegment).join(" "));
    }

    return forcedSegments;
  }

  return segments.length > 0 ? segments : [text];
}

/**
 * Résout les conflits de timing entre segments
 */
function resolveTimingConflicts(srtEntries) {
  const sortedEntries = [...srtEntries].sort(
    (a, b) => a.startTime - b.startTime
  );
  const minGap = 0.1; // 100ms de marge minimum

  for (let i = 1; i < sortedEntries.length; i++) {
    const current = sortedEntries[i];
    const previous = sortedEntries[i - 1];

    // Si le segment actuel commence avant la fin du précédent
    if (current.startTime < previous.endTime) {
      const overlap = previous.endTime - current.startTime + minGap;

      // Option 1: Décaler le segment actuel
      current.startTime = previous.endTime + minGap;

      // S'assurer que la durée reste raisonnable (min 1 seconde)
      const minDuration = 1.0;
      if (current.endTime - current.startTime < minDuration) {
        current.endTime = current.startTime + minDuration;
      }
    }
  }

  return sortedEntries;
}

/**
 * Pipeline principal amélioré
 */
async function generateImprovedSrt(session_id) {
  console.log(`[Improved SRT] Génération pour la session ${session_id}...`);

  // 1. Récupérer les segments vidéo dans l'ordre chronologique
  let segments = await VideoSegmentModel.findManyBy({ session_id });

  segments = segments
    .filter((s) => s.start_time && s.end_time)
    .sort((a, b) => timeToSeconds(a.start_time) - timeToSeconds(b.start_time));

  if (!segments.length) {
    throw new Error("Aucun segment trouvé pour cette session");
  }

  console.log(`[Improved SRT] ${segments.length} segments récupérés`);

  // 2. Pour chaque segment, récupérer et traiter les sous-titres
  const srtEntries = [];

  for (const segment of segments) {
    const subtitles = await SubtitleModel.getSubtitlesBySegment(
      segment.segment_id
    );

    if (subtitles.length === 0) {
      console.log(
        `[Improved SRT] ⚠️ Aucun sous-titre pour segment ${segment.segment_id}`
      );
      continue;
    }

    // Combiner tous les sous-titres du segment
    const fullText = subtitles
      .map((s) => s.text)
      .join(" ")
      .trim();

    if (!fullText) continue;

    // Découper intelligemment le texte
    const textSegments = smartTextSplit(fullText);

    const segmentStart = timeToSeconds(segment.start_time);
    const segmentEnd = timeToSeconds(segment.end_time);
    const segmentDuration = segmentEnd - segmentStart;

    // Distribuer les sous-segments dans la durée du segment
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

  // 3. Résoudre les conflits de timing
  const resolvedEntries = resolveTimingConflicts(srtEntries);

  // 4. Générer le fichier SRT final
  const srtContent = resolvedEntries
    .map((entry, index) => {
      return `${index + 1}\n${formatSrtTime(
        entry.startTime
      )} --> ${formatSrtTime(entry.endTime)}\n${entry.text}\n`;
    })
    .join("\n");

  console.log(
    `[Improved SRT] ✅ ${resolvedEntries.length} entrées SRT générées`
  );
  return srtContent;
}

/**
 * Controller Express pour l'export SRT amélioré
 */
async function exportImprovedSrtController(req, res) {
  const { session_id } = req.params;

  try {
    const srtContent = await generateImprovedSrt(session_id);

    const fs = require("fs");
    const path = require("path");

    const filePath = path.join(
      __dirname,
      `../../../srt_exports/session_${session_id}_improved.srt`
    );

    // S'assurer que le dossier existe
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, srtContent, "utf8");
    console.log(`[Improved SRT] Fichier sauvegardé : ${filePath}`);

    return res.download(filePath);
  } catch (error) {
    console.error("❌ Erreur export SRT amélioré :", error);
    return res.status(500).json({
      message: "Erreur lors de la génération du SRT amélioré",
      error: error.message,
    });
  }
}

/**
 * Version alternative avec groupement intelligent des segments chevauchants
 */
async function generateGroupedSrt(session_id) {
  console.log(
    `[Grouped SRT] Génération avec groupement pour session ${session_id}...`
  );

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

  console.log(`[Grouped SRT] ${groups.length} groupes créés`);

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
      allTexts.push(...subtitles.map((s) => s.text));
    }

    if (allTexts.length === 0) continue;

    // Combiner et nettoyer les textes
    const combinedText = allTexts.join(" ").trim();
    const textSegments = smartTextSplit(combinedText, 10);

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

  const resolvedEntries = resolveTimingConflicts(srtEntries);

  return resolvedEntries
    .map((entry, index) => {
      return `${index + 1}\n${formatSrtTime(
        entry.startTime
      )} --> ${formatSrtTime(entry.endTime)}\n${entry.text}\n`;
    })
    .join("\n");
}

module.exports = {
  generateImprovedSrt,
  exportImprovedSrtController,
  generateGroupedSrt,
  smartTextSplit,
  resolveTimingConflicts,
  formatSrtTime,
};
