const pool = require("../config/db");
const Model = require("./Model");
const SegmentStatus = require("../utils/SegmentStatus");

class VideoSegmentModel extends Model {
  constructor() {
    super("video_segments");
  }

  // méthodes spécifiques au modèle VideoSegment si nécessaire
  async findAvailableSegment(session_id) {
    const query = `
    SELECT * FROM ${this.tableName}
    WHERE session_id = $1 AND status = $2
    LIMIT 1
    `;
    const result = await pool.query(query, [
      session_id,
      SegmentStatus.AVAILABLE,
    ]);
    return result.rows[0];
  }

  async markSegmentInProgress(segment_id) {
    console.log("Mise à jour du segment :", segment_id);
    const query = `
    UPDATE ${this.tableName}
    SET status = $1
    WHERE segment_id = $2
    RETURNING *;
  `;
    const result = await pool.query(query, [
      segment_id,
      SegmentStatus.IN_PROGRESS,
    ]);
    console.log(
      `Segment ${segment_id} marqué comme '${SegmentStatus.IN_PROGRESS}'`
    );
    return result.rows[0];
  }

  async getSegmentsByStatus(session_id, status) {
    // On sélectionne tous les segments de la session
    // dont le statut est égal à status
    const query = `
      SELECT *
      FROM video_segments
      WHERE session_id = $1
        AND status = $2
    `;
    const values = [session_id, status];

    const { rows } = await pool.query(query, values);
    return rows; // rows est un tableau d'objets
  }
  async updateSegmentStatus(segment_id, newStatus) {
    console.log(
      `Mise à jour du segment ${segment_id} avec le statut : ${newStatus}`
    );
    const query = `
      UPDATE ${this.tableName}
      SET status = $1
      WHERE segment_id = $2
      RETURNING *;
    `;
    try {
      const result = await pool.query(query, [newStatus, segment_id]);

      if (result.rowCount === 0) {
        console.error(`Aucun segment trouvé avec l'ID ${segment_id}`);
        return null;
      }

      console.log("Segment mis à jour avec succès :", result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error(
        `Erreur lors de la mise à jour du statut pour le segment ${segment_id} :`,
        error
      );
      throw error;
    }
  }

  // async markSegmentInProgress(segment_id) {
  //   return this.updateOneById(segment_id, { status: "in_progress" });
  // }
  // Trouver un segment par son ID
  async findById(segment_id) {
    return await this.findOneById(segment_id, "segment_id");
  }

  async findManyByWithUsers(session_id, user_id) {
    const query = `
      SELECT 
        s.segment_id,
        s.start_time,
        s.end_time,
        s.status,
        u.username AS assigned_to,
        s.session_id
      FROM public.video_segments AS s
      JOIN public.segment_users AS su ON su.segment_id = s.segment_id
      JOIN public.users AS u ON su.user_id = u.user_id
      WHERE s.session_id = $1 AND su.user_id = $2
      ORDER BY s.start_time ASC;
    `;
    try {
      const result = await pool.query(query, [session_id, user_id]);
      return result.rows;
    } catch (error) {
      console.error(
        `Erreur lors de la récupération des segments pour session ${session_id} et user ${user_id} :`,
        error
      );
      throw error;
    }
  }

  async getPreviousSegment(segment_id) {
    const query = `
      SELECT * 
      FROM ${this.tableName} 
      WHERE end_time <= (
        SELECT start_time 
        FROM ${this.tableName} 
        WHERE segment_id = $1
      )
      AND segment_id != $1
      AND session_id = (
        SELECT session_id 
        FROM ${this.tableName} 
        WHERE segment_id = $1
      )
      ORDER BY end_time DESC
      LIMIT 1;
    `;
    const result = await pool.query(query, [segment_id]);
    return result.rows[0]; // Retourne le segment précédent ou `undefined`
  }

  async getNextSegment(segment_id) {
    const query = `
      SELECT * 
      FROM ${this.tableName} 
      WHERE start_time >= (
        SELECT end_time 
        FROM ${this.tableName} 
        WHERE segment_id = $1
      )
      AND segment_id != $1
      AND session_id = (
        SELECT session_id 
        FROM ${this.tableName} 
        WHERE segment_id = $1
      )
      ORDER BY start_time ASC
      LIMIT 1;
    `;
    const result = await pool.query(query, [segment_id]);
    return result.rows[0]; // Retourne le segment suivant ou `undefined`
  }
  async getLastSegment(session_id) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE session_id = $1
      ORDER BY start_time DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [session_id]);
    return result.rows[0];
  }

  // Exemple pour getUpcomingAvailableSegment
/**
 * Récupère le prochain segment “pending” (déjà réservé) pour CE user,
 * dont start_time > afterSeconds.
 */
// Dans ton modèle : éviter le toTime/toSeconds, on compare directement en SQL
async getUpcomingPendingSegmentByUser(session_id, user_id, afterSeconds) {
  const query = `
    SELECT s.*
    FROM video_segments s
    JOIN segment_users su
      ON su.segment_id = s.segment_id
      AND su.user_id = $2
    WHERE s.session_id = $1
      AND s.status    = 'pending'
      AND EXTRACT(
      EPOCH 
      FROM (s.start_time::time)
    ) >= ($3 - 1)
    ORDER BY s.start_time ASC
    LIMIT 1
  `;
  const result = await pool.query(query, [session_id, user_id, afterSeconds]);
  return result.rows[0] || null;
}

async getUpcomingAssignedSegmentForUser(session_id, user_id, afterSeconds) {
  const pad = (n) => n.toString().padStart(2, '0');
  const toTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };
  const afterTime = toTime(afterSeconds);

  const query = `
    SELECT s.*
    FROM ${this.tableName} s
    JOIN segment_users su
      ON su.segment_id = s.segment_id
    WHERE s.session_id = $1
      AND su.user_id = $2
      AND s.status = 'in_progress'
      AND s.start_time > $3
    ORDER BY s.start_time ASC
    LIMIT 1
  `;
  const result = await pool.query(query, [session_id, user_id, afterTime]);
  return result.rows[0] || null;
}



}
module.exports = new VideoSegmentModel();
