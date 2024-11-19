const pool = require("../config/db");
const Model = require("./Model");

class SegmentUserModel extends Model {
  constructor() {
    super("segment_users");
  }

  // Ajoutez des méthodes spécifiques au modèle SegmentUser si nécessaire
  // async assignUserToSegment(userId, segmentId) {
  //   const query = `
  //   INSERT INTO ${this.tableName} (user_id, segment_id, assigned_at)
  //   VALUES ($1, $2, NOW())
  //   RETURNING *
  //   `;
  //   const result = await pool.query(query, [userId, segmentId]);
  //   return result.rows[0];
  // }
  // async findUserSegment(userId, sessionId) {
  //   const query = `
  //     SELECT * FROM ${this.tableName} su
  //     JOIN video_segments vs ON su.segment_id = vs.segment_id
  //     WHERE su.user_id = $1 AND vs.session_id = $2
  //   `;
  //   const result = await pool.query(query, [userId, sessionId]);
  //   return result.rows[0];
  // }
}

module.exports = new SegmentUserModel();
