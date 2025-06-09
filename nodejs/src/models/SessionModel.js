const Model = require("./Model");

class SessionModel extends Model {
  constructor() {
    super("sessions");
  }
  /**
   * Démarre une session : enregistre le start_time (horodatage actuel)
   */
  async startSession(sessionId) {
    const query = `
      UPDATE sessions
      SET start_time = NOW()
      WHERE session_id = $1
      RETURNING *;
    `;
    const result = await pool.query(query, [sessionId]);
    return result.rows[0];
  }

  /**
   * Arrête une session : enregistre le end_time (horodatage actuel)
   */
  async stopSession(sessionId) {
    const query = `
      UPDATE sessions
      SET end_time = NOW()
      WHERE session_id = $1
      RETURNING *;
    `;
    const result = await pool.query(query, [sessionId]);
    return result.rows[0];
  }
  // méthodes spécifiques au modèle Session si nécessaire
}

module.exports = new SessionModel();
