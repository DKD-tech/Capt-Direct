const Subtitle = require("../models/SubtitleModel");

async function getSubtitlesFromSession(sessionId) {
  const subs = await Subtitle.findManyBy({ session_id: sessionId });

  return subs.map((sub) => ({
    start_time: sub.start_time,
    end_time: sub.end_time,
    text: sub.text,
    created_by: sub.created_by,
    created_at: sub.created_at,
  }));
}

module.exports = { getSubtitlesFromSession };
