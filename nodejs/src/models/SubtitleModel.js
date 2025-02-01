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
    
      /**
       * Ajouter un mot au sous-titre en temps réel (stockage temporaire Redis)
       */
      async addWordToSubtitle(segment_id, word, created_by) {
        if (!segment_id || !word || !created_by) {
          throw new Error("Segment ID, mot et auteur sont requis.");
        }
    
        const redisKey = `subtitles:${segment_id}`;
        await redisClient.rPush(redisKey, JSON.stringify({ word, created_by }));
      }
    
      /**
       * Finaliser un sous-titre après validation (ex: après 10s)
       */
      async finalizeSubtitle(segment_id, created_by) {
        const redisKey = `subtitles:${segment_id}`;
        const words = await redisClient.lRange(redisKey, 0, -1);
    
        if (!words || words.length === 0) {
          throw new Error("Aucun mot à finaliser pour ce segment.");
        }
    
        const fullText = words.map((entry) => JSON.parse(entry).word).join(" ");
    
        // Sauvegarde dans PostgreSQL
        const newSubtitle = await this.insert({
          segment_id,
          text: fullText,
          created_by,
        });
    
        // Nettoyage Redis après stockage
        await redisClient.del(redisKey);
    
        return newSubtitle;
      }
    
      /**
       * Récupérer les sous-titres d'un segment
       */
      async getSubtitlesBySegment(segment_id) {
        return await this.findManyBy({ segment_id });
      }
    

      async getFinalSubtitleBySegment(segment_id) {
        //console.log(`🛠️ Exécution de la requête SQL pour récupérer le sous-titre finalisé du segment ${segment_id}`);
      
        const query = `
          SELECT s.*
          FROM subtitles s
          JOIN video_segments vs ON s.segment_id = vs.segment_id
          WHERE s.segment_id = $1 
          AND vs.is_finalized = TRUE 
          ORDER BY s.created_at DESC 
          LIMIT 1;
        `;
      
        const result = await pool.query(query, [segment_id]);
      
        console.log(`📌 Résultat SQL brut :`, result);
        console.log(`📌 Contenu de result.rows :`, result.rows);
      
        return result.rows.length > 0 ? result.rows[0] : null;
      }
      
      
      /**
       * Récupérer les sous-titres d'une session complète
       */
      async getSubtitlesBySession(session_id) {
        const query = `
          SELECT * FROM subtitles
          WHERE segment_id IN (
            SELECT segment_id FROM video_segments WHERE session_id = $1
          )
        `;
        try {
          const result = await pool.query(query, [session_id]);
          return result.rows;
        } catch (error) {
          console.error("Erreur lors de la récupération des sous-titres :", error);
          throw error;
        }
      }
    
      async storeFinalSubtitle(segment_id, text, created_by) { // <-- Ajoute created_by
        if (!segment_id || !text || !created_by) {
            throw new Error("Le segment_id, le texte final et le created_by sont requis.");
        }
    
        const query = `
            INSERT INTO subtitles (segment_id, text, created_by)
            VALUES ($1, $2, $3)  -- Correction ici : $3 au lieu de NOW()
            RETURNING *;
        `;
    
        try {
            const result = await pool.query(query, [segment_id, text, created_by]); // <-- Passe created_by ici
            console.log(`✅ Sous-titre final enregistré pour le segment ${segment_id} :`, result.rows[0]);
            return result.rows[0];
        } catch (error) {
            console.error("❌ Erreur lors de l'enregistrement du sous-titre final :", error);
            throw error;
        }
    }
    
      /**
       * Mettre à jour un sous-titre après sa finalisation
       */
      async updateSubtitle(subtitle_id, data) {
        return await this.updateOneById(subtitle_id, data);
      }
    }
    
    module.exports = new SubtitleModel();
    