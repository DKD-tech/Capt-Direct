const pool = require("../config/db");
const Model = require("./Model");

class VideoSegmentModel extends Model {
  constructor() {
    super("video_segments");
  }

  // méthodes spécifiques au modèle VideoSegment si nécessaire
  // async findAvailableSegment(sessionId) {
  //   const query = `
  //   SELECT * FROM ${this.tableName}
  //   WHERE session_id = $1 AND status = 'available'
  //   LIMIT 1
  //   `;
  //   const result = await pool.query(query, [sessionId]);
  //   return result.rows[0];
  // }

  // async markSegmentInProgress(segmentId) {
  //   const query = `
  //   UPDATE ${this.tableName}
  //   SET status = 'in_progress'
  //   WHERE segment_id = $1
  //   RETURNING *
  //   `;
  //   const result = await pool.query(query, [segmentId]);
  //   return result.rows[0];
  // }
}

module.exports = new VideoSegmentModel();
