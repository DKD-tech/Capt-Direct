// backend/controllers/srtController.js

const VideoSegmentModel = require("../../models/VideoSegmentModel");
const SubtitleModel     = require("../../models/SubtitleModel");
const {
  handleOverlapWithWordsFuzzy,
  correctText,
} = require("../../utils/algo_textes");

/**
 * Convertit "HH:MM:SS,mmm" ou "H:M:S.sss" en secondes (float).
 */
function timeStringToSeconds(timeString) {
  if (!timeString || typeof timeString !== "string") return 0;
  const parts = timeString.split(":");
  if (parts.length !== 3) return 0;
  let [h, m, s] = parts;
  s = s.replace(",", ".");
  const hours   = parseInt(h, 10) || 0;
  const minutes = parseInt(m, 10) || 0;
  const seconds = parseFloat(s)   || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Formatte un nombre de secondes (float) en "HH:MM:SS,mmm"
 */
function formatTimeToSRT(time) {
  if (isNaN(time) || time < 0) {
    return "00:00:00,000";
  }
  const totalMs  = Math.round(time * 1000);
  const hours    = Math.floor(totalMs / 3600000);
  const minutes  = Math.floor((totalMs % 3600000) / 60000);
  const seconds  = Math.floor((totalMs % 60000) / 1000);
  const ms       = totalMs % 1000;

  const HH  = String(hours).padStart(2, "0");
  const MM  = String(minutes).padStart(2, "0");
  const SS  = String(seconds).padStart(2, "0");
  const mmm = String(ms).padStart(3, "0");

  return `${HH}:${MM}:${SS},${mmm}`;
}

/**
 * Coupe un texte en plusieurs lignes ≤ maxLength caractères, sans couper un mot.
 * Exemple : splitTextByLength("Bonjour tout le monde", 10) → ["Bonjour", "tout le", "monde"]
 */
function splitTextByLength(text, maxLength = 40) {
  if (typeof text !== "string" || text.trim() === "") {
    return [];
  }
  const words = text.trim().split(/\s+/);
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const tentative = currentLine ? `${currentLine} ${word}` : word;
    if (tentative.length <= maxLength) {
      currentLine = tentative;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Controller allégé pour exporter le fichier SRT d'une session.
 * 1) Charger segments + sous-titres, corriger chevauchements, corriger orthographe.
 * 2) Pour chaque segment : 
 *    • splitTextByLength(fullText, MAX_LINE_LENGTH)
 *    • répartir la durée sur ces lignes ; fractionner si > MAX_DURATION ;
 *    • fusionner tout bloc < MIN_DURATION.
 * 3) Générer le SRT numéroté.
 */
async function exportSrtController(req, res) {
  const sessionId = req.params.sessionId;
  try {
    // --- (1) Charger tous les segments de la session
    const segments = await VideoSegmentModel.findManyBy({
      session_id: sessionId,
    });
    if (!segments || segments.length === 0) {
      return res
        .status(404)
        .json({ message: "Aucun segment trouvé pour cette session." });
    }

    // --- (2) Trier par start_time
    segments.sort(
      (a, b) =>
        timeStringToSeconds(a.start_time) - timeStringToSeconds(b.start_time)
    );

    // --- (3) Charger les sous-titres attachés à chaque segment
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      seg.subtitles =
        (await SubtitleModel.findManyBy({ segment_id: seg.segment_id })) || [];
    }

    // --- (4) Gérer chevauchements entre segments successifs
    for (let i = 1; i < segments.length; i++) {
      const prevSeg = segments[i - 1];
      const currSeg = segments[i];
      const prevText = prevSeg.subtitles.map((s) => s.text).join(" ").trim();
      const currText = currSeg.subtitles.map((s) => s.text).join(" ").trim();
      if (!prevText || !currText) continue;

      let overlapResult;
      try {
        overlapResult = handleOverlapWithWordsFuzzy(prevText, currText);
      } catch (err) {
        console.warn(
          `handleOverlapWithWordsFuzzy a échoué entre segments ${
            i - 1
          } & ${i} :`,
          err
        );
        continue;
      }
      const { adjustedText1, adjustedText2, overlap } = overlapResult || {};
      if (overlap) {
        prevSeg.subtitles = adjustedText1 ? [{ text: adjustedText1 }] : [];
        currSeg.subtitles = adjustedText2 ? [{ text: adjustedText2 }] : [];
      }
    }

    // --- (5) Correction orthographique (post-chevauchement)
    for (const seg of segments) {
      const raw = seg.subtitles.map((s) => s.text).join(" ").trim();
      if (!raw) {
        seg.subtitles = [];
        continue;
      }
      let corr;
      try {
        corr = correctText(raw).trim();
      } catch (err) {
        console.warn(
          `correctText a échoué sur le segment ${seg.segment_id} :`,
          err
        );
        corr = raw;
      }
      seg.subtitles = corr ? [{ text: corr }] : [];
    }

    // --- (6) Génération des blocs SRT
    let subtitleIndex = 1;          // compteur SRT
    let lastEnd = null;             // timestamp de fin du dernier bloc
    const MIN_DURATION = 1.0;       // durée min (1 s) par bloc
    const MAX_DURATION = 6.0;       // durée max (6 s) par bloc
    const MAX_LINE_LENGTH = 35;
    const srtBlocks = [];
    const MAX_CPS = 20;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];

      // (6.1) Reconstituer le texte complet du segment (après chevauchement + correction)
      const fullText = seg.subtitles
        .map((s) => s.text.trim())
        .join(" ")
        .trim();
      if (!fullText) continue;

      // (6.2) Calculer startTime / endTime (en secondes)
      let startTime = timeStringToSeconds(seg.start_time);
      let endTime   = timeStringToSeconds(seg.end_time);
      if (lastEnd !== null && startTime < lastEnd) {
        startTime = lastEnd;
      }
      if (endTime <= startTime) continue;  // pas de durée utile
      const totalDuration = endTime - startTime;
      if (totalDuration < MIN_DURATION) continue;

      // (6.3) Découper fullText en lignes ≤ MAX_LINE_LENGTH
      let lines = splitTextByLength(fullText, MAX_LINE_LENGTH);
      if (lines.length === 0) continue;

      // (6.4) Si une seule ligne et durée > MAX_DURATION, fractionner en deux moitiés de mots
      if (lines.length === 1 && totalDuration > MAX_DURATION) {
        const tokens = lines[0].split(/\s+/);
        const wordCount = tokens.length;
        const mid = Math.ceil(wordCount / 2);
        const firstHalf  = tokens.slice(0, mid).join(" ");
        const secondHalf = tokens.slice(mid).join(" ");
        lines = [];
        if (firstHalf)  lines.push(firstHalf);
        if (secondHalf) lines.push(secondHalf);
      }

      // (6.5) Répartir la durée sur les lignes obtenues
      let lineCount = lines.length;
      let lineDuration = totalDuration / lineCount;

      // (6.6) Si après cette répartition lineDuration > MAX_DURATION (ex. phrase 15 s → 2 lin. = 7.5 s chacune),
      //       on calcule un nombre de blocs = ceil(totalDuration / MAX_DURATION) et on répartit par mots
      if (lineDuration > MAX_DURATION) {
        const numChunks = Math.ceil(totalDuration / MAX_DURATION);
        const tokens = lines.join(" ").split(/\s+/);
        const baseWords = Math.floor(tokens.length / numChunks);
        let remWords = tokens.length % numChunks;
        let cursor = 0;
        const wordBlocks = [];
        for (let c = 0; c < numChunks; c++) {
          const take = baseWords + (remWords > 0 ? 1 : 0);
          if (remWords > 0) remWords--;
          const sliceWords = tokens.slice(cursor, cursor + take);
          if (sliceWords.length > 0) {
            wordBlocks.push(sliceWords.join(" "));
          }
          cursor += take;
        }
        lines = wordBlocks;
        lineCount = lines.length;
        lineDuration = totalDuration / lineCount;
      }

      // (6.7) Générer les blocs SRT pour chaque ligne, fusionner les blocs < MIN_DURATION
      let tempBlocks = [];

      for (let j = 0; j < lineCount; j++) {
        const textLine = lines[j];
        if (!textLine) continue;

        let blockStart = j === 0
          ? startTime
          : Math.max(lastEnd, startTime + j * lineDuration);
        let blockEnd   = j === lineCount - 1
          ? endTime
          : startTime + (j + 1) * lineDuration;
        if (blockEnd > endTime) blockEnd = endTime;

        const dur = blockEnd - blockStart;
        if (dur < MIN_DURATION) {
          tempBlocks.push({ start: blockStart, end: blockEnd, text: textLine, duration: dur });
          continue;
        }

        // Avertissement si bloc trop dense (CPS > MAX_CPS)
        const cps = textLine.length / dur;
        if (cps > MAX_CPS) {
          console.warn(`Bloc ${subtitleIndex} dense (${cps.toFixed(1)} cps) : "${textLine}"`);
        }

        if (tempBlocks.length > 0) {
          // Fusion de tempBlocks + ce bloc
          let fusedText = "";
          const fusedStart = tempBlocks[0].start;
          const fusedEnd   = blockEnd;
          tempBlocks.forEach((tb) => {
            fusedText += tb.text + " ";
          });
          fusedText = fusedText.trim() + " " + textLine;
          fusedText = fusedText.trim();

          const fusedDur = fusedEnd - fusedStart;
          const fusedCps = fusedText.length / fusedDur;
          if (fusedCps > MAX_CPS) {
            console.warn(`Bloc ${subtitleIndex} après fusion dense (${fusedCps.toFixed(1)} cps) : "${fusedText}"`);
          }

          const entry = [
            subtitleIndex,
            `${formatTimeToSRT(fusedStart)} --> ${formatTimeToSRT(fusedEnd)}`,
            fusedText,
          ];
          srtBlocks.push(entry.join("\r\n"));
          subtitleIndex++;
          lastEnd = fusedEnd;
          tempBlocks = [];
        } else {
          // Émettre le bloc normalement
          const entry = [
            subtitleIndex,
            `${formatTimeToSRT(blockStart)} --> ${formatTimeToSRT(blockEnd)}`,
            textLine,
          ];
          srtBlocks.push(entry.join("\r\n"));
          subtitleIndex++;
          lastEnd = blockEnd;
        }
      }

      // (6.8) Fusion finale si tempBlocks est encore non vide
      if (tempBlocks.length > 0) {
        const lastIndex = srtBlocks.length - 1;
        if (lastIndex >= 0) {
          // Modifier le dernier bloc existant
          const linesBloc   = srtBlocks[lastIndex].split("\r\n");
          const existingText = linesBloc.slice(2).join(" ");
          const [ existingStart, existingEnd ] =
            linesBloc[1]
              .split(" --> ")
              .map((t) => timeStringToSeconds(t));

          const fusedStart = existingStart;
          const fusedEnd   = tempBlocks[tempBlocks.length - 1].end;
          let fusedText = existingText;
          tempBlocks.forEach((tb) => {
            fusedText += " " + tb.text;
          });
          fusedText = fusedText.trim();

          const fusedDur = fusedEnd - fusedStart;
          const fusedCps = fusedText.length / fusedDur;
          if (fusedCps > MAX_CPS) {
            console.warn(`Bloc ${subtitleIndex - 1} après fusion finale dense (${fusedCps.toFixed(1)} cps) : "${fusedText}"`);
          }

          const newTimeLine = `${formatTimeToSRT(fusedStart)} --> ${formatTimeToSRT(fusedEnd)}`;
          srtBlocks[lastIndex] = [
            linesBloc[0], // index
            newTimeLine,
            fusedText,
          ].join("\r\n");
          lastEnd = fusedEnd;
        } else {
          // Aucun bloc précédent : créer un bloc unique pour tempBlocks
          let fusedText = "";
          const fusedStart = tempBlocks[0].start;
          const fusedEnd   = tempBlocks[tempBlocks.length - 1].end;
          tempBlocks.forEach((tb) => {
            fusedText += tb.text + " ";
          });
          fusedText = fusedText.trim();

          const fusedDur = fusedEnd - fusedStart;
          const fusedCps = fusedText.length / fusedDur;
          if (fusedCps > MAX_CPS) {
            console.warn(`Bloc ${subtitleIndex} après fusion standalone dense (${fusedCps.toFixed(1)} cps) : "${fusedText}"`);
          }

          const entry = [
            subtitleIndex,
            `${formatTimeToSRT(fusedStart)} --> ${formatTimeToSRT(fusedEnd)}`,
            fusedText,
          ];
          srtBlocks.push(entry.join("\r\n"));
          subtitleIndex++;
          lastEnd = fusedEnd;
        }
        tempBlocks = [];
      }
    } // fin du for segments

    // --- (7) Assemblage final du contenu .srt
    const srtContent =
      srtBlocks.length > 0
        ? srtBlocks.join("\r\n\r\n") + "\r\n\r\n"
        : "";

    if (!srtContent.trim()) {
      return res.status(500).json({ message: "Aucun SRT généré (vide)." });
    }

    // --- (8) Envoi du fichier SRT
    res.setHeader("Content-Type", "application/x-subrip; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="session-${sessionId}.srt"`
    );
    res.send(srtContent);
  } catch (err) {
    console.error("Erreur export SRT :", err);
    return res.status(500).json({ message: "Erreur génération SRT." });
  }
}

module.exports = { exportSrtController };
