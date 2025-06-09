const fs = require("fs");
const path = require("path");
const VideoSegmentModel = require("../../models/VideoSegmentModel");
const SubtitleModel = require("../../models/SubtitleModel");

function convertToSrtTime(seconds) {
  const hrs = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const secs = String(Math.floor(seconds % 60)).padStart(2, "0");
  const millis = "000";
  return `${hrs}:${mins}:${secs},${millis}`;
}

function timeToSeconds(timeStr) {
  const [h, m, s] = timeStr.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

async function exportSrtController(req, res) {
  const { session_id } = req.params;

  try {
    console.log(
      `[SRT Export] Récupération des segments pour la session ${session_id}...`
    );
    let segments = await VideoSegmentModel.findManyBy({ session_id });

    segments = segments
      .filter((s) => s.start_time && s.end_time)
      .sort((a, b) => {
        const aStart =
          typeof a.start_time === "string"
            ? timeToSeconds(a.start_time)
            : a.start_time;
        const bStart =
          typeof b.start_time === "string"
            ? timeToSeconds(b.start_time)
            : b.start_time;
        return aStart - bStart;
      });

    if (!segments.length) {
      console.log(
        `[SRT Export] Aucun segment trouvé pour la session ${session_id}.`
      );
      return res.status(404).json({ message: "Aucun segment trouvé." });
    }

    console.log(`[SRT Export] ${segments.length} segments récupérés.`);

    const groups = [];
    let currentGroup = [segments[0]];
    for (let i = 1; i < segments.length; i++) {
      const last = currentGroup[currentGroup.length - 1];
      const current = segments[i];

      const lastEnd = timeToSeconds(last.end_time || last.end_time);
      const currentStart = timeToSeconds(
        current.start_time || current.start_time
      );

      if (currentStart <= lastEnd) {
        currentGroup.push(current);
      } else {
        groups.push(currentGroup);
        currentGroup = [current];
      }
    }
    groups.push(currentGroup);

    console.log(`[SRT Export] ${groups.length} groupes de segments créés.`);

    let srt = "";
    let index = 1;

    for (const [gIndex, group] of groups.entries()) {
      const groupStart = Math.min(
        ...group.map((s) => timeToSeconds(s.start_time))
      );
      const groupEnd = Math.max(...group.map((s) => timeToSeconds(s.end_time)));

      const allSubtitles = [];
      for (const seg of group) {
        const subs = await SubtitleModel.getSubtitlesBySegment(seg.segment_id);
        if (subs.length === 0) {
          console.log(
            `[SRT Export] ⚠️ Aucun sous-titre pour le segment ${seg.segment_id}`
          );
        } else {
          console.log(
            `[SRT Export] ✅ ${subs.length} sous-titres récupérés pour segment ${seg.segment_id}`
          );
        }
        allSubtitles.push(...subs.map((s) => s.text));
      }

      const blockDuration = 6;
      const duration = groupEnd - groupStart;
      const steps = Math.ceil(duration / blockDuration);

      for (let i = 0; i < steps; i++) {
        const start = groupStart + i * blockDuration;
        const end = Math.min(groupEnd, start + blockDuration);
        const text = allSubtitles.splice(0, 2).join("\n");

        if (text.trim() === "") continue;

        console.log(
          `[SRT Export] Bloc ${index} de ${convertToSrtTime(
            start
          )} à ${convertToSrtTime(end)} :\n${text}`
        );

        srt += `${index++}\n`;
        srt += `${convertToSrtTime(start)} --> ${convertToSrtTime(end)}\n`;
        srt += `${text}\n\n`;
      }
    }

    const filePath = path.join(
      __dirname,
      `../../../srt_exports/session_${session_id}.srt`
    );
    fs.writeFileSync(filePath, srt);
    console.log(`[SRT Export] Fichier SRT généré : ${filePath}`);

    return res.download(filePath);
  } catch (error) {
    console.error("❌ Erreur export SRT :", error);
    return res.status(500).json({ message: "Erreur export SRT" });
  }
}

module.exports = { exportSrtController };
