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
  async addSubtitle(data) {
    const requiredFields = ["segment_id", "text", "created_by"];
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`Le champ ${field} est requis.`);
      }
    }

    // Ajout du sous-titre
    return await this.insert(data);
  }

  // Récupérer les sous-titres d'un segment
  async getSubtitlesBySegment(segment_id) {
    return await this.findManyBy({ segment_id });
  }

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

  // // Désactiver un sous-titre (soft delete)
  // async deleteSubtitle(subtitle_id) {
  //   return await this.updateOneById(subtitle_id, { is_active: false });
  // }
}

module.exports = new SubtitleModel();
