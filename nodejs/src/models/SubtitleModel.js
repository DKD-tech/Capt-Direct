const Model = require("./Model");

class SubtitleModel extends Model {
  constructor() {
    super("subtitles");
  }

  // // Ajoutez des méthodes spécifiques au modèle Subtitle si nécessaire
  // // Ajouter un sous-titre
  // async addSubtitle(subtitleData) {
  //   const { segment_id, start_time, end_time, text, created_by } = subtitleData;
  //   const query = `INSERT INTO ${this.tableName} (segment_id, start_time, end_time, text, created_by, created_at, last_modified, is_active, status)
  //     VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), true, 'draft')
  //     RETURNING *`;
  //   const result = await pool.query(query, [
  //     segment_id,
  //     start_time,
  //     end_time,
  //     text,
  //     created_by,
  //   ]);
  //   return result.rows[0];
  // }
  // // Récupérer tous les sous-titres d'un segment
  // async getSubtitlesBySegment(segment_id) {
  //   const query = `
  //     SELECT * FROM ${this.tableName}
  //     WHERE segment_id = $1 AND is_active = true
  //     ORDER BY start_time
  //   `;
  //   const result = await pool.query(query, [segment_id]);
  //   return result.rows;
  // }
  // // Mettre à jour un sous-titre
  // async updateSubtitle(subtitle_id, updates) {
  //   const setClause = Object.keys(updates)
  //     .map((key, index) => `${key} = $${index + 2}`)
  //     .join(", ");
  //   const query = `
  //     UPDATE ${this.tableName}
  //     SET ${setClause}, last_modified = NOW()
  //     WHERE subtitle_id = $1
  //     RETURNING *
  //   `;
  //   const values = [subtitle_id, ...Object.values(updates)];
  //   const result = await pool.query(query, values);
  //   return result.rows[0];
  // }
  // // Supprimer un sous-titre
  // async deleteSubtitle(subtitle_id) {
  //   const query = `
  //     UPDATE ${this.tableName}
  //     SET is_active = false, last_modified = NOW()
  //     WHERE subtitle_id = $1
  //     RETURNING *
  //   `;
  //   const result = await pool.query(query, [subtitle_id]);
  //   return result.rows[0];
  // }
  // Ajouter un sous-titre
  
  
    // Ajouter un sous-titre
    async addSubtitle(data) {
      const requiredFields = ["segment_id", "start_time", "end_time", "text", "created_by"];
      for (const field of requiredFields) {
        if (!data[field]) {
          throw new Error(`Le champ ${field} est requis.`);
        }
      }
  
      // Ajout du sous-titre dans PostgreSQL
      return await this.insert(data);
    }
  
    // Récupérer les sous-titres d'un segment
    async getSubtitlesBySegment(segment_id) {
      if (!segment_id) {
        throw new Error("Le segment_id est requis pour récupérer les sous-titres.");
      }
  
      // Requête pour récupérer les sous-titres associés à un segment
      return await this.findManyBy({ segment_id });
    }
  
    // Mettre à jour un sous-titre
    async updateSubtitle(subtitle_id, data) {
      if (!subtitle_id) {
        throw new Error("L'ID du sous-titre est requis pour la mise à jour.");
      }
  
      // Mise à jour dans PostgreSQL
      return await this.updateOneById(subtitle_id, data);
    }
  }
  
  module.exports = new SubtitleModel();