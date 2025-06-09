/**
 * Convertit un timestamp string en secondes.
 * Accepte : "00:01:02,123" ou "00:01:02"
 */
function timeStringToSeconds(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return 0;
  const [h, m, sPart] = timeStr.split(":");
  if (!sPart) return 0;

  const [s, ms = "0"] = sPart.split(",");
  return (
    parseInt(h || 0) * 3600 +
    parseInt(m || 0) * 60 +
    parseInt(s || 0) +
    parseInt(ms || 0) / 1000
  );
}

/**
 * Convertit des secondes en string format SRT : HH:MM:SS,mmm
 */
function formatTimeToSRT(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return (
    `${String(h).padStart(2, "0")}:` +
    `${String(m).padStart(2, "0")}:` +
    `${String(s).padStart(2, "0")},` +
    `${String(ms).padStart(3, "0")}`
  );
}

/**
 * Crée un bloc SRT
 */
function buildSrtBlock(index, startSec, endSec, text) {
  return `${index}\n${formatTimeToSRT(startSec)} --> ${formatTimeToSRT(
    endSec
  )}\n${text.trim()}\n`;
}

/**
 * Fusionne et nettoie les segments pour produire un contenu SRT
 */
function processSubtitlesRespectingSegments(segments) {
  const result = [];

  for (const seg of segments) {
    const text = (seg.subtitles || [])
      .map((s) => s.text.trim())
      .filter(Boolean)
      .join("\n");

    if (!text) continue;

    const startSec = timeStringToSeconds(seg.start_time);
    const endSec = timeStringToSeconds(seg.end_time);

    result.push({ startSec, endSec, text });
  }

  result.sort((a, b) => a.startSec - b.startSec);

  return result
    .map((s, i) => buildSrtBlock(i + 1, s.startSec, s.endSec, s.text))
    .join("\n");
}

function processSubtitlesByTimeIntersections(segments) {
  const times = new Set();

  // Récupère tous les points de début/fin
  for (const seg of segments) {
    const startSec = timeStringToSeconds(seg.start_time);
    const endSec = timeStringToSeconds(seg.end_time);
    times.add(startSec);
    times.add(endSec);
  }

  const sortedTimes = Array.from(times).sort((a, b) => a - b);
  const result = [];

  for (let i = 0; i < sortedTimes.length - 1; i++) {
    const intervalStart = sortedTimes[i];
    const intervalEnd = sortedTimes[i + 1];

    const activeTexts = [];

    for (const seg of segments) {
      const segStart = timeStringToSeconds(seg.start_time);
      const segEnd = timeStringToSeconds(seg.end_time);

      if (segStart <= intervalStart && segEnd >= intervalEnd) {
        const texts = (seg.subtitles || [])
          .map((s) => s.text.trim())
          .filter(Boolean);
        activeTexts.push(...texts);
      }
    }

    if (activeTexts.length > 0) {
      // Supprime les doublons exacts
      const merged = [...new Set(activeTexts)].join(" ");
      result.push({
        startSec: intervalStart,
        endSec: intervalEnd,
        text: merged,
      });
    }
  }

  return result
    .map((s, i) => buildSrtBlock(i + 1, s.startSec, s.endSec, s.text))
    .join("\n");
}


module.exports = {
  processSubtitlesRespectingSegments,
  timeStringToSeconds,
  formatTimeToSRT,
  processSubtitlesByTimeIntersections,
};
