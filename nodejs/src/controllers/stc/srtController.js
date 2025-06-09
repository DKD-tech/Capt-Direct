// backend/controllers/stc/srtController.js

const VideoSegmentModel = require("../../models/VideoSegmentModel");
const SubtitleModel = require("../../models/SubtitleModel");
const {
  processSubtitlesByTimeIntersections,
  formatTimeToSRT,
} = require("../../helpers/srt");

async function exportSrtController(req, res) {
  const sessionId = req.params.sessionId;

  try {
    // Récupération des segments
    const segments = await VideoSegmentModel.findManyBy({
      session_id: sessionId,
    });

    // Conversion des timestamps (secondes ou chaînes simples) en format SRT "HH:MM:SS,mmm"
    segments.forEach((seg) => {
      if (typeof seg.start_time === "number") {
        seg.start_time = formatTimeToSRT(seg.start_time);
      } else if (
        typeof seg.start_time === "string" &&
        !seg.start_time.includes(",")
      ) {
        seg.start_time += ",000";
      }

      if (typeof seg.end_time === "number") {
        seg.end_time = formatTimeToSRT(seg.end_time);
      } else if (
        typeof seg.end_time === "string" &&
        !seg.end_time.includes(",")
      ) {
        seg.end_time += ",000";
      }
    });

    // Chargement des sous-titres associés à chaque segment
    for (const seg of segments) {
      seg.subtitles =
        (await SubtitleModel.findManyBy({ segment_id: seg.segment_id })) || [];
    }

    // Génération du contenu SRT fusionné
    const srtContent = processSubtitlesByTimeIntersections(segments);

    if (!srtContent.trim()) {
      return res.status(500).json({ message: "Aucun SRT généré (vide)." });
    }

    // Envoi du fichier SRT généré
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

module.exports = { exportSRT: exportSrtController };
