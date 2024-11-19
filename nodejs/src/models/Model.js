const pool = require("../config/db");

class Model {
  constructor(tableName) {
    if (!tableName)
      throw new Error("Le nom de la table doit être défini pour le modèle.");
    this.tableName = tableName;
  }

  async insert(data) {
    const query = `INSERT INTO ${this.tableName} (${Object.keys(data).join(
      ", "
    )}) VALUES (${Object.keys(data)
      .map((_, i) => `$${i + 1}`)
      .join(", ")}) RETURNING *`;
    const values = Object.values(data);
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async updateOneById(id, data) {
    const setClause = Object.keys(data)
      .map((key, i) => `${key} = $${i + 1}`)
      .join(", ");
    const values = [...Object.values(data), id];
    const query = `UPDATE ${this.tableName} SET ${setClause} WHERE user_id = $${values.length} RETURNING user_id`;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async delete(id) {
    const query = `DELETE FROM ${this.tableName} WHERE user_id = $1`;
    const result = await pool.query(query, [id]);
    return result.rowCount;
  }

  async findOneById(id) {
    const query = `SELECT * FROM ${this.tableName} WHERE user_id = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  async findOneBy(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const conditions = keys.map((key, i) => `${key} = $${i + 1}`).join(" AND ");
    const query = `SELECT * FROM ${this.tableName} WHERE ${conditions} LIMIT 1`;
    const result = await pool.query(query, values);
    return result.rows[0];
  }
}

module.exports = Model;
