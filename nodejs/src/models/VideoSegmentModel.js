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
      ORDER BY start_time ASC
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
   * Marquer un segment comme finalisé et assigner le suivant
   */
  async finalizeSegment(segment_id) {
    const query = `
      UPDATE ${this.tableName}
      SET is_finalized = TRUE, status = 'finalized'
      WHERE segment_id = $1
      RETURNING *;
    `;
    try {
      const result = await pool.query(query, [segment_id]);
      if (result.rowCount === 0) {
        throw new Error(`Aucun segment trouvé avec l'ID ${segment_id}.`);
      }
      console.log(`✅ Segment ${segment_id} marqué comme finalisé.`);
      
      // Vérifier et assigner le segment suivant
      const nextSegment = await this.getNextSegment(segment_id);
      if (nextSegment) {
        await this.updateSegmentStatus(nextSegment.segment_id, 'assigned');
        console.log(`➡️ Segment suivant ${nextSegment.segment_id} assigné.`);
      }
      return result.rows[0];
    } catch (error) {
      console.error(`❌ Erreur lors de la finalisation du segment ${segment_id} :`, error);
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
  async findSegmentsBySessionId(session_id) {
    const query = `
      SELECT segment_id, start_time, end_time, status, is_finalized, session_id
      FROM ${this.tableName} 
      WHERE session_id = $1
      ORDER BY start_time ASC;
    `;
    try {
      const result = await pool.query(query, [session_id]);
      return result.rows; // Retourne les segments avec is_finalized
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

  async findManyByWithUsers(session_id) {
    const query = `
      SELECT 
        s.segment_id,
        s.start_time,
        s.end_time,
        s.status,
        s.is_finalized, -- ✅ Ajout du champ is_finalized
        u.username AS assigned_to,
        s.session_id
      FROM public.video_segments AS s
      LEFT JOIN (
        SELECT DISTINCT ON (su.segment_id) su.segment_id, su.user_id
        FROM public.segment_users AS su
        ORDER BY su.segment_id, su.assigned_at DESC
      ) AS latest_assignments ON latest_assignments.segment_id = s.segment_id
      LEFT JOIN public.users AS u ON latest_assignments.user_id = u.user_id
      WHERE s.session_id = $1
      ORDER BY s.start_time ASC;
    `;
    try {
      const result = await pool.query(query, [session_id]);
      return result.rows;
    } catch (error) {
      console.error(
        `Erreur lors de la récupération des segments avec utilisateurs pour la session ${session_id} :`,
        error
      );
      throw error;
    }
}

  
 /**
   * Trouver le segment précédent
   */
 async getPreviousSegment(segment_id) {
  const query = `
    SELECT * 
    FROM ${this.tableName} 
    WHERE start_time < (
      SELECT start_time 
      FROM ${this.tableName} 
      WHERE segment_id = $1
    )
    AND session_id = (
      SELECT session_id 
      FROM ${this.tableName} 
      WHERE segment_id = $1
    )
    ORDER BY start_time DESC
    LIMIT 1;
  `;
  const result = await pool.query(query, [segment_id]);
  return result.rows[0];
}

   /**
   * Trouver le segment suivant
   */
   async getNextSegment(segment_id) {
    const query = `
        SELECT * 
        FROM ${this.tableName} 
        WHERE segment_id > $1
        AND session_id = (
            SELECT session_id 
            FROM ${this.tableName} 
            WHERE segment_id = $1
        )
        AND status != 'finalized'
        ORDER BY segment_id ASC
        LIMIT 1;
    `;
    const result = await pool.query(query, [segment_id]);
    return result.rows[0]; // Retourne le segment suivant ou `undefined`
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
      console.error(`Erreur lors de la mise à jour du statut pour le segment ${segment_id} :`, error);
      throw error;
    }
  }
  /**
 * Trouver tous les segments disponibles triés par start_time.
 */
async findAvailableSegmentsSorted(session_id) {
  const query = `
    SELECT * FROM ${this.tableName}
    WHERE session_id = $1 AND status = 'available'
    ORDER BY start_time ASC;
  `;
  try {
    const result = await pool.query(query, [session_id]);
    return result.rows; // Retourne les segments triés
  } catch (error) {
    console.error(
      `Erreur lors de la récupération des segments triés pour la session ${session_id} :`,
      error
    );
    throw error;
  }
}

}



module.exports = new VideoSegmentModel();
