const pool = require("../config/db");
const Model = require("./Model");

class VideoSegmentModel extends Model {
  constructor() {
    super("video_segments");
  }

  /**
   * Trouver un segment disponible pour une session donnée.
   */
  async findAvailableSegment(session_id) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE session_id = $1 AND status = 'available'
      LIMIT 1;
    `;
    try {
      const result = await pool.query(query, [session_id]);
      return result.rows[0];
    } catch (error) {
      console.error("Erreur lors de la recherche d'un segment disponible :", error);
      throw error;
    }
  }

  /**
   * Trouver un segment par son ID.
   */
  async findById(segment_id) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE segment_id = $1;
    `;
    try {
      const result = await pool.query(query, [segment_id]);
      return result.rows[0];
    } catch (error) {
      console.error(`Erreur lors de la recherche du segment ID ${segment_id} :`, error);
      throw error;
    }
  }
/**
 * Récupérer tous les segments pour une session triés par start_time.
 */
async findSegmentsBySessionId(session_id) {
  const query = `
    SELECT * FROM ${this.tableName}
    WHERE session_id = $1
    ORDER BY start_time ASC;
  `;
  try {
    const result = await pool.query(query, [session_id]);
    return result.rows; // Retourne les segments triés
  } catch (error) {
    console.error(
      `Erreur lors de la récupération des segments pour la session ${session_id} :`,
      error
    );
    throw error;
  }
}

  /**
   * Mettre à jour le statut d'un segment.
   */
  async updateSegmentStatus(segment_id, newStatus) {
    console.log(`Tentative de mise à jour du segment ${segment_id} avec le statut ${newStatus}`);

    const query = `
      UPDATE ${this.tableName}
      SET status = $1, updated_at = NOW()
      WHERE segment_id = $2
      RETURNING *;
    `;
    try {
      const result = await pool.query(query, [newStatus, segment_id]);
      if (result.rowCount === 0) {
        throw new Error(`Aucun segment trouvé avec l'ID ${segment_id}.`);
      }

      console.log(`Segment ${segment_id} mis à jour avec le statut : ${newStatus}`);
      return result.rows[0];
    } catch (error) {
      console.error(
        `Erreur lors de la mise à jour du statut pour le segment ${segment_id} :`,
        error
      );
      throw error;
    }
  }

  /**
   * Marquer un segment comme "in_progress".
   * Le segment doit d'abord être dans l'état "assigned".
   */
  async markSegmentInProgress(segment_id) {
    const query = `
      UPDATE ${this.tableName}
      SET status = 'in_progress', updated_at = NOW()
      WHERE segment_id = $1 AND status = 'assigned'
      RETURNING *;
    `;
    try {
      const result = await pool.query(query, [segment_id]);
      if (result.rowCount === 0) {
        throw new Error(`Impossible de passer le segment ${segment_id} à 'in_progress'.`);
      }

      console.log(`Segment ${segment_id} marqué comme 'in_progress'.`);
      return result.rows[0];
    } catch (error) {
      console.error(
        `Erreur lors du marquage du segment ${segment_id} comme 'in_progress' :`,
        error
      );
      throw error;
    }
  }

  /**
   * Réinitialiser les segments inutilisés (assigned mais non in_progress).
   */
  async resetInactiveSegments(inactivityLimitMinutes = 5) {
    const query = `
      UPDATE ${this.tableName}
      SET status = 'available', updated_at = NOW()
      WHERE status = 'assigned'
      AND updated_at < NOW() - INTERVAL '${inactivityLimitMinutes} minutes'
      RETURNING *;
    `;
    try {
      const result = await pool.query(query);
      console.log(`Segments réinitialisés : ${result.rowCount}`);
      return result.rows; // Retourne les segments réinitialisés
    } catch (error) {
      console.error("Erreur lors de la réinitialisation des segments :", error);
      throw error;
    }
  }
}

module.exports = new VideoSegmentModel();
