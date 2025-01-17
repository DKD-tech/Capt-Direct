const Model = require("./Model");
const pool = require("../config/db");
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
  // Ajouter un sous-titre et marquer le segment comme "in_progress"
  
    // Ajouter un sous-titre
    async addSubtitle(data) {
      const requiredFields = ["segment_id", "start_time", "end_time", "text", "created_by"];
      for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null || data[field] === "") {
          throw new Error(`Le champ ${field} est requis.`);
        }
      }
  
      // Ajout du sous-titre dans PostgreSQL
      return await this.insert(data);
    }
  
    // Récupérer les sous-titres d'un segment
    async getSubtitlesBySegment(segment_id) {
      return await this.findManyBy({ segment_id });
    }
  
    // Récupérer les sous-titres depuis Redis (si implémenté)
    async getSubtitlesBySegment1(segment_id) {
      try {
        const subtitlesKeys = await redisClient.keys(`subtitles:${segment_id}:*`);
        const subtitles = await Promise.all(
          subtitlesKeys.map((key) => redisClient.get(key))
        );
        return subtitles.map((subtitle) => JSON.parse(subtitle));
      } catch (error) {
        console.error("Erreur lors de la récupération des sous-titres:", error);
        throw error;
      }
    }
  
    // Mettre à jour un sous-titre
    async updateSubtitle(subtitle_id, data) {
      return await this.updateOneById(subtitle_id, data);
    }
    async getSubtitlesBySession(session_id) {
      const query = `
        SELECT * FROM subtitles
       WHERE segment_id IN (
      SELECT segment_id FROM video_segments WHERE session_id = $1
    )
    ORDER BY start_time ASC;
   `;
      try {
        const result = await pool.query(query, [session_id]);
        return result.rows;
      } catch (error) {
        console.error("Erreur lors de la récupération des sous-titres :", error);
        throw error;
      }
    }
    
  }
  
  
  module.exports = new SubtitleModel();
  