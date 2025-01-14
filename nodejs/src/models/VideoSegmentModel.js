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
    console.log("Mise à jour du segment :", segment_id);
    const query = `
    UPDATE ${this.tableName}
    SET status = 'in_progress'
    WHERE segment_id = $1
    RETURNING *
    `;
    const result = await pool.query(query, [segment_id]);
    console.log("Résultat de la mise à jour :", result.rows[0]);
    return result.rows[0];
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
}

module.exports = new VideoSegmentModel();
