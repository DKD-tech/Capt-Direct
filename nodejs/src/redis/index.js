require("dotenv").config();
const redis = require("redis");

const client = redis.createClient({
  url: `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

client.on("error", (err) => console.error("Erreur de connexion Redis :", err));

(async () => {
  try {
    await client.connect();
    console.log("Connecté à Redis");
  } catch (err) {
    console.error("Impossible de se connecter à Redis :", err);
    process.exit(1);
  }
})();

async function setSession(userId, token) {
  if (!userId) throw new Error("userId is required");
  if (!token) throw new Error("token is required");

  const expirationTime = 7 * 24 * 60 * 60; // Expiration de 7 jours en secondes
  try {
    return await client.set(`session:${userId}`, token, {
      EX: expirationTime,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la définition de la session dans Redis:",
      error
    );
  }
}

// Fonction pour récupérer une session
async function getSession(userId) {
  if (!userId) throw new Error("userId is required");
  try {
    return await client.get(`session:${userId}`);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de la session dans Redis:",
      error
    );
  }
}

// Fonction pour supprimer une session
async function deleteSession(userId) {
  if (!userId) throw new Error("userId is required");
  try {
    return await client.del(`session:${userId}`);
  } catch (error) {
    console.error(
      "Erreur lors de la suppression de la session dans Redis:",
      error
    );
  }
}

module.exports = { client, setSession, getSession, deleteSession };
