const pool = require("../config/db");
const Model = require("./Model");

class VideoSegmentModel extends Model {
  constructor() {
    super("video_segments");
  }

  // méthodes spécifiques au modèle VideoSegment si nécessaire
  async findAvailableSegment(session_id) {
    const query = `
    SELECT * FROM ${this.tableName}
    WHERE session_id = $1 AND status = 'available'
    LIMIT 1
    `;
    const result = await pool.query(query, [session_id]);
    return result.rows[0];
  }

  async markSegmentInProgress(segment_id) {
    const query = `
    UPDATE ${this.tableName}
    SET status = 'in_progress'
    WHERE segment_id = $1
    RETURNING *
    `;
    const result = await pool.query(query, [segment_id]);
    return result.rows[0];
  }
  // async markSegmentInProgress(segment_id) {
  //   return this.updateOneById(segment_id, { status: "in_progress" });
  // }
}

module.exports = new VideoSegmentModel();
