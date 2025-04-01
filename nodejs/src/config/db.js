require("dotenv").config();
const { Pool } = require("pg");

const isProd = process.env.DATABASE_URL !== undefined;
// Utilisation des variables d'environnement de Railway avec SSL activé
const pool = isProd
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: false, // ← désactive le SSL en local
    });

pool.on("error", (err) => {
  console.error("Erreur de connexion PostgreSQL :", err);
});

module.exports = pool;
