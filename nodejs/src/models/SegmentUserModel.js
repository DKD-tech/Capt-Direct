const pool = require("../config/db");
const Model = require("./Model");
const { client: redisClient } = require("../redis/index");

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
  // Trouver les utilisateurs connectés à une session
  async findUserSegment(user_id, session_id) {
    const query = `
      SELECT su.* FROM ${this.tableName} su
      JOIN video_segments vs ON su.segment_id = vs.segment_id
      WHERE su.user_id = $1 AND vs.session_id = $2
    `;
    const result = await pool.query(query, [user_id, session_id]);
    return result.rows;
  }

  //
  // Assigner un utilisateur à un segment
  async assignUserToSegment(user_id, segment_id) {
    const query = `
    INSERT INTO ${this.tableName} (user_id, segment_id, assigned_at)
    VALUES ($1, $2, NOW()) RETURNING *
  `;
    const result = await pool.query(query, [user_id, segment_id]);
    return result.rows[0];
  }
  async findAssignmentsBySession(session_id) {
    if (typeof session_id !== "number") {
      throw new Error("session_id doit être un entier.");
    }
    const query = `
      SELECT su.*
      FROM ${this.tableName} su
      JOIN video_segments vs ON su.segment_id = vs.segment_id
      WHERE vs.session_id = $1
    `;
    const result = await pool.query(query, [session_id]);
    return result.rows;
  }
  async findAssignmentsByUserAndSession(user_id, session_id) {
    const query = `
      SELECT su.*
      FROM segment_users su
      JOIN video_segments vs ON su.segment_id = vs.segment_id
      WHERE su.user_id = $1 AND vs.session_id = $2
    `;
    const result = await pool.query(query, [user_id, session_id]);
    return result.rows;
  }

  async findAssignmentsBySegment(segment_id) {
    const query = `
      SELECT * FROM segment_users
      WHERE segment_id = $1
    `;
    const result = await pool.query(query, [segment_id]);
    return result.rows;
  }

  async deleteAssignmentsByUser(user_id) {
    const query = `
      DELETE FROM segment_users
      WHERE user_id = $1
    `;
    await pool.query(query, [user_id]);
  }
  async findConnectedUsers(session_id) {
    // const query = `
    //   SELECT DISTINCT su.user_id
    //   FROM segment_users su
    //   JOIN video_segments vs ON su.segment_id = vs.segment_id
    //   WHERE vs.session_id = $1
    // `;
    // const result = await pool.query(query, [session_id]);
    // return result.rows;
    const redisKey = `session:${session_id}:users`;
    const connectedUsers = await client.sMembers(redisKey); // Récupérer les utilisateurs de Redis
    return connectedUsers.map((user_id) => ({ user_id }));
  }
  async isUserAssignedToSegment(user_id, segment_id) {
    const query = `
      SELECT 1
      FROM ${this.tableName}
      WHERE user_id = $1 AND segment_id = $2
      LIMIT 1
    `;
    const result = await pool.query(query, [user_id, segment_id]);
    return result.rows.length > 0; // Renvoie true si l'utilisateur est assigné
  }
}

module.exports = new SegmentUserModel();
