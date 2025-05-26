

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
  
  /**
   * Génère le contenu SRT à partir d'une liste de segments,
   * triés par start_time et en incluant aussi ceux sans sous-titres.
   *
   * @param {Array} segments - objets { start_time, end_time, subtitles: [{ text }] }
   * @param {Object} opts - { minFirstSegmentDuration, minSubtitleDuration, maxCPS, maxVisibleLines, maxCharsPerLine }
   * @returns {string} contenu .srt complet
   */
  function generateSrt(segments, opts) {
    const {
      minFirstSegmentDuration,
      minSubtitleDuration,
      maxCPS,
      maxVisibleLines,
      maxCharsPerLine
    } = opts;
  
    // 1️⃣ TRIER les segments par start_time
    const sorted = [...segments].sort((a, b) => {
      return timeStringToSeconds(a.start_time)
           - timeStringToSeconds(b.start_time);
    });
  
    let index = 1;
    const blocks = sorted.flatMap((seg, idx) => {
      const start = timeStringToSeconds(seg.start_time);
      let end   = timeStringToSeconds(seg.end_time);
      if (isNaN(start) || isNaN(end) || end <= start) {
        console.warn(`Segment ${seg.segment_id} a un time invalide : on force ${minSubtitleDuration}s`);
        end = start + minSubtitleDuration;
      }
  
      // CAS sans sous-titres → on renvoie un bloc vide
      if (!Array.isArray(seg.subtitles) || seg.subtitles.length === 0) {
        const srt = 
          `${index++}\n` +
          `${formatTimeToSRT(start)} --> ${formatTimeToSRT(end)}\n` +
          ``; // pas de texte
        return [srt];
      }
  
      // Sinon, reconstituer le texte et découper en lignes
      const fullText = seg.subtitles
        .map(s => s.text)
        .join(' ')
        .replace(/[\r\n]+/g, ' ')
        .trim();
  
      const words = fullText.split(' ');
      const lines = [];
      let cur = '';
      for (const w of words) {
        if ((cur + w).length <= maxCharsPerLine) {
          cur += w + ' ';
        } else {
          lines.push(cur.trim());
          cur = w + ' ';
        }
      }
      if (cur.trim()) lines.push(cur.trim());
  
      // Calcul des durées
      const segDur   = end - start;
      const idealDur = fullText.length / maxCPS;
      let dur = Math.max(minSubtitleDuration, Math.min(segDur, idealDur));
      if (idx === 0 && dur < minFirstSegmentDuration) {
        dur = minFirstSegmentDuration;
      }
      const perLine = Math.max(minSubtitleDuration, dur / lines.length);
  
      // Génération progressive (défilement)
      const visible = [];
      return lines.map((line, i) => {
        const bStart = start + i * perLine;
        const bEnd   = Math.min(end, bStart + perLine);
        visible.push(line);
        if (visible.length > maxVisibleLines) {
          visible.shift();
        }
        const text = visible.join('\n');
        const srt  =
          `${index++}\n` +
          `${formatTimeToSRT(bStart)} --> ${formatTimeToSRT(bEnd)}\n` +
          `${text}`;
        return srt;
      });
    });
  
    return blocks.join('\n\n');
  }
  
  module.exports = { generateSrt };
  