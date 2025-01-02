const pool = require("./src/config/db");

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Erreur de requête PostgreSQL :", err);
  } else {
    console.log("Connexion PostgreSQL réussie :", res.rows[0]);
  }
  pool.end();
});
