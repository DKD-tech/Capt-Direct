// backend/controllers/srtController.js
const VideoSegmentModel = require("../../models/VideoSegmentModel");
const SubtitleModel = require("../../models/SubtitleModel");
const {
  handleOverlapWithWordsFuzzy,
  correctText,
} = require("../../utils/algo_textes");

/**
 * Convertit "HH:MM:SS.xxx" en secondes (float).
 */
function timeStringToSeconds(timeString) {
  const [h, m, s] = timeString.split(":");
  const sec = parseFloat(s.replace(",", ".")) || 0;
  return (parseInt(h, 10) || 0) * 3600 + (parseInt(m, 10) || 0) * 60 + sec;
}

/**
 * Formate un timestamp (en s) en "HH:MM:SS,mmm".
 */
function formatTimeToSRT(time) {
  if (isNaN(time)) return "00:00:00,000";
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = Math.floor(time % 60);
  const ms = Math.floor((time % 1) * 1000);
  return (
    `${String(hours).padStart(2, "0")}:` +
    `${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")},` +
    `${String(ms).padStart(3, "0")}`
  );
}

async function exportSrtController(req, res) {
  const sessionId = req.params.sessionId;
  try {
    // Charger tous les segments de la session
    const segments = await VideoSegmentModel.findManyBy({
      session_id: sessionId,
    });
    console.log("Segments chargés:", segments.length);

    // Trier les segments par start_time pour garantir ordre chronologique
    segments.sort(
      (a, b) =>
        timeStringToSeconds(a.start_time) - timeStringToSeconds(b.start_time)
    );

    // Charger les sous-titres pour chaque segment
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      seg.subtitles =
        (await SubtitleModel.findManyBy({ segment_id: seg.segment_id })) || [];
    }

    // Correction des chevauchements entre segments consécutifs
    for (let i = 1; i < segments.length; i++) {
      const prevSeg = segments[i - 1];
      const currSeg = segments[i];

      const prevText = prevSeg.subtitles.map((s) => s.text).join(" ");
      const currText = currSeg.subtitles.map((s) => s.text).join(" ");

      const { adjustedText1, adjustedText2, overlap } =
        handleOverlapWithWordsFuzzy(prevText, currText);

      if (overlap) {
        console.log(
          `Chevauchement corrigé entre segments ${prevSeg.segment_id} et ${currSeg.segment_id} : "${overlap}"`
        );
        prevSeg.subtitles = adjustedText1 ? [{ text: adjustedText1 }] : [];
        currSeg.subtitles = adjustedText2 ? [{ text: adjustedText2 }] : [];
      }
    }
    // ── NOUVEAU : correction orthographique de tous les mots ──
    for (const seg of segments) {
      const raw = seg.subtitles.map((s) => s.text).join(" ");
      const corr = raw ? correctText(raw) : "";
      console.log(
        `Texte corrigé (orthographe) pour segment ${seg.segment_id}: "${corr}"`
      );
      seg.subtitles = corr ? [{ text: corr }] : [];
    }
    console.log("Segments avant génération du SRT :", segments);

    // Variables de configuration
    let subtitleIndex = 1;
    const minFirstSegmentDuration = 10;
    const minSubtitleDuration = 2;
    const maxCPS = 12;
    const maxVisibleLines = 3;
    const maxLineLength = 40;

    // Génération du contenu SRT
    const srtBlocks = segments.map((segment, segmentIndex) => {
      const fullText = (segment.subtitles || [])
        .map((s) => s.text)
        .join(" ")
        .replace(/[\r\n]+/g, " ")
        .trim();

      console.log(
        `Sous-titres pour le segment ${segment.segment_id} :`,
        fullText
      );

      let startTime = timeStringToSeconds(segment.start_time);
      let endTime = timeStringToSeconds(segment.end_time);

      if (isNaN(startTime) || isNaN(endTime) || endTime <= startTime) {
        console.error(
          `Erreur : start_time (${startTime}) et end_time (${endTime}) invalides pour segment ${segment.segment_id}`
        );
        endTime = startTime + 1;
      }

      if (segmentIndex === 0 && endTime - startTime < minFirstSegmentDuration) {
        endTime = startTime + minFirstSegmentDuration;
      }

      if (!fullText) {
        return `${subtitleIndex++}\n${formatTimeToSRT(
          startTime
        )} --> ${formatTimeToSRT(endTime)}\n`;
      }

      const words = fullText.split(" ");
      const lines = [];
      let currentLine = "";
      words.forEach((word) => {
        if ((currentLine + word).length <= maxLineLength) {
          currentLine += word + " ";
        } else {
          lines.push(currentLine.trim());
          currentLine = word + " ";
        }
      });
      if (currentLine.trim() !== "") lines.push(currentLine.trim());

      console.log(
        `Sous-titres découpés pour le segment ${segment.segment_id} :`,
        lines
      );

      const segmentDuration = endTime - startTime;
      const idealDuration = fullText.length / maxCPS;
      let adjustedDuration = Math.max(
        minSubtitleDuration,
        Math.min(segmentDuration, idealDuration)
      );
      if (segmentIndex === 0 && adjustedDuration < minFirstSegmentDuration) {
        adjustedDuration = minFirstSegmentDuration;
      }
      const lineDuration = Math.max(
        minSubtitleDuration,
        adjustedDuration / lines.length
      );

      const visibleLines = [];
      return lines
        .map((line, i) => {
          const blockStart = startTime + i * lineDuration;
          const blockEnd = Math.min(endTime, blockStart + lineDuration);

          visibleLines.push(line);
          if (visibleLines.length > maxVisibleLines) {
            visibleLines.shift();
          }

          const blockText = visibleLines.join("\n");
          const srtBlock =
            `${subtitleIndex++}\n` +
            `${formatTimeToSRT(blockStart)} --> ${formatTimeToSRT(
              blockEnd
            )}\n` +
            `${blockText}`;

          return srtBlock;
        })
        .join("\n\n");
    });

    const srtContent = srtBlocks.join("\n\n");
    console.log("Longueur SRT généré :", srtContent.length);

    if (!srtContent.trim()) {
      return res.status(500).json({ message: "Aucun SRT généré (vide)." });
    }

    res.setHeader("Content-Type", "application/x-subrip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="session-${sessionId}.srt"`
    );
    res.send(srtContent);
  } catch (err) {
    console.error("Erreur export SRT :", err);
    res.status(500).json({ message: "Erreur génération SRT" });
  }
}

module.exports = { exportSrtController };
