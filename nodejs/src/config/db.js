require("dotenv").config();
const { Pool } = require("pg");

// Utilisation des variables d'environnement de Railway avec SSL activé
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Gestion des erreurs de connexion
pool.on("error", (err) => {
  console.error("Erreur de connexion PostgreSQL :", err);
});

module.exports = pool;
