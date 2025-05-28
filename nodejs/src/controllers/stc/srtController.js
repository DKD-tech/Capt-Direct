// backend/controllers/srtController.js
const VideoSegmentModel = require('../../models/VideoSegmentModel');
const SubtitleModel     = require('../../models/SubtitleModel');
const { handleOverlapWithWordsFuzzy, correctText } = require('../../utils/algo_textes');

/**
 * Convertit "HH:MM:SS.xxx" en secondes (float).
 */
function timeStringToSeconds(timeString) {
  const [h, m, s] = timeString.split(':');
  const sec = parseFloat(s.replace(',', '.')) || 0;
  return (parseInt(h, 10) || 0) * 3600
       + (parseInt(m, 10) || 0) * 60
       + sec;
}

/**
 * Formate un timestamp (en s) en "HH:MM:SS,mmm".
 */
function formatTimeToSRT(time) {
  if (isNaN(time)) return '00:00:00,000';
  const hours   = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = Math.floor(time % 60);
  const ms      = Math.floor((time % 1) * 1000);
  return `${String(hours).padStart(2,'0')}:` +
         `${String(minutes).padStart(2,'0')}:` +
         `${String(seconds).padStart(2,'0')},` +
         `${String(ms).padStart(3,'0')}`;
}

async function exportSrtController(req, res) {
  const sessionId = req.params.sessionId;
  try {
    // Charger tous les segments de la session
    const segments = await VideoSegmentModel.findManyBy({ session_id: sessionId });
    segments.sort((a, b) => timeStringToSeconds(a.start_time) - timeStringToSeconds(b.start_time));

    // Charger les sous-titres pour chaque segment
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      seg.subtitles = await SubtitleModel.findManyBy({ segment_id: seg.segment_id }) || [];
    }

    // Correction des chevauchements entre segments consécutifs
    for (let i = 1; i < segments.length; i++) {
      const prevSeg = segments[i - 1];
      const currSeg = segments[i];

      const prevText = prevSeg.subtitles.map(s => s.text).join(' ');
      const currText = currSeg.subtitles.map(s => s.text).join(' ');

      const { adjustedText1, adjustedText2, overlap } = handleOverlapWithWordsFuzzy(prevText, currText);
      if (overlap) {
        prevSeg.subtitles = adjustedText1 ? [{ text: adjustedText1 }] : [];
        currSeg.subtitles = adjustedText2 ? [{ text: adjustedText2 }] : [];
      }
    }

    // ── CORRECTION ORTHOGRAPHIQUE ──
    for (const seg of segments) {
      const raw = seg.subtitles.map(s => s.text).join(' ');
      const corr = raw ? correctText(raw) : '';
      seg.subtitles = corr ? [{ text: corr }] : [];
    }

    // ── AJUSTEMENT DES TIMESTAMPS POUR FENÊTRES CONTIGUËS ──
    let currentStart   = timeStringToSeconds(segments[0].start_time);
    const windowDuration = timeStringToSeconds(segments[0].end_time) - currentStart;
    segments.forEach(seg => {
      const newStart = currentStart;
      const newEnd   = newStart + windowDuration;
      seg.start_time = formatTimeToSRT(newStart);
      seg.end_time   = formatTimeToSRT(newEnd);
      currentStart   = newEnd;
    });

    // Variables de configuration
    let subtitleIndex       = 1;
    const minFirstSegmentDuration = 10;
    const minSubtitleDuration     = 2;
    const maxCPS                  = 12;
    const maxVisibleLines         = 3;
    const maxLineLength           = 40;

    // Génération du contenu SRT
    const srtBlocks = segments.map((segment, segmentIndex) => {
      const fullText = (segment.subtitles || [])
        .map(s => s.text)
        .join(' ')
        .replace(/[\n]+/g, ' ')
        .trim();

      let startTime = timeStringToSeconds(segment.start_time);
      let endTime   = timeStringToSeconds(segment.end_time);
      if (segmentIndex === 0 && (endTime - startTime) < minFirstSegmentDuration) {
        endTime = startTime + minFirstSegmentDuration;
      }

      if (!fullText) {
        return `${subtitleIndex++}\n${formatTimeToSRT(startTime)} --> ${formatTimeToSRT(endTime)}\n`;
      }

      // Découpage en lignes
      const words = fullText.split(' ');
      const lines = [];
      let currentLine = '';
      words.forEach(word => {
        if ((currentLine + word).length <= maxLineLength) {
          currentLine += word + ' ';
        } else {
          lines.push(currentLine.trim());
          currentLine = word + ' ';
        }
      });
      if (currentLine.trim() !== '') lines.push(currentLine.trim());

      // Ajustement de la durée : on utilise toujours la totalité du segment
      const segmentDuration = endTime - startTime;
      let adjustedDuration  = Math.max(
        minSubtitleDuration,
        segmentDuration
      );
      if (segmentIndex === 0 && adjustedDuration < minFirstSegmentDuration) {
        adjustedDuration = minFirstSegmentDuration;
      }
      const lineDuration = adjustedDuration / lines.length;

      // Construction des blocs visibles
      const visibleLines = [];
      return lines.map((line, i) => {
        const blockStart = startTime + i * lineDuration;
        const blockEnd   = Math.min(endTime, blockStart + lineDuration);
        visibleLines.push(line);
        if (visibleLines.length > maxVisibleLines) visibleLines.shift();
        const blockText = visibleLines.join('\n');
        const srtBlock =
          `${subtitleIndex++}\n` +
          `${formatTimeToSRT(blockStart)} --> ${formatTimeToSRT(blockEnd)}\n` +
          `${blockText}`;
        return srtBlock;
      }).join('\n\n');
    });

    const srtContent = srtBlocks.join('\n\n');
    if (!srtContent.trim()) {
      return res.status(500).json({ message: 'Aucun SRT généré (vide).' });
    }

    res.setHeader('Content-Type', 'application/x-subrip');
    res.setHeader('Content-Disposition', `attachment; filename="session-${sessionId}.srt"`);
    res.send(srtContent);

  } catch (err) {
    console.error('Erreur export SRT :', err);
    res.status(500).json({ message: 'Erreur génération SRT' });
  }
}

module.exports = { exportSrtController };
