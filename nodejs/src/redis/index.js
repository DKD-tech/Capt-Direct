require("dotenv").config();
const redis = require("redis");
const { promisify } = require("util");

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

async function setAsync(key, value, options = {}) {
  try {
    return await client.set(key, value, options);
  } catch (error) {
    console.error("Erreur lors de la définition de la clé dans Redis:", error);
    throw error;
  }
}

async function getAsync(key) {
  try {
    return await client.get(key);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de la clé dans Redis:",
      error
    );
    throw error;
  }
}
async function delAsync(key) {
  try {
    return await client.del(key);
  } catch (error) {
    console.error("Erreur lors de la suppression de la clé dans Redis:", error);
    throw error;
  }
}

async function lRangeAsync(key, start, stop) {
  try {
    return await client.lRange(key, start, stop);
  } catch (error) {
    console.error("Erreur lors de l'utilisation de lRange dans Redis:", error);
    throw error;
  }
}

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

async function addUserToSession(sessionId, userId) {
  try {
    return await client.sAdd(`session:${sessionId}:users`, String(userId));
  } catch (err) {
    console.error(
      `Erreur lors de l'ajout de l'utilisateur ${userId} à session:${sessionId}:`,
      err
    );
    throw err;
  }
}

async function removeUserFromSession(sessionId, userId) {
  try {
    return await client.sRem(`session:${sessionId}:users`, String(userId));
  } catch (err) {
    console.error(
      `Erreur lors de la suppression de l'utilisateur ${userId} de session:${sessionId}:`,
      err
    );
    throw err;
  }
}

async function getSessionUsers(sessionId) {
  try {
    return await client.sMembers(`session:${sessionId}:users`);
  } catch (err) {
    console.error(
      `Erreur lors de la récupération des utilisateurs de session:${sessionId}:`,
      err
    );
    throw err;
  }
}

async function incrUserSegmentCount(sessionId, userId) {
  return await client.incr(`seg:scheduler:${sessionId}:user:${userId}`);
}

async function getUserSegmentCount(sessionId, userId) {
  const val = await client.get(`seg:scheduler:${sessionId}:user:${userId}`);
  return parseInt(val) || 0;
}

async function getRoundRobinIndex(sessionId) {
  const val = await client.get(`seg:scheduler:${sessionId}:index`);
  return parseInt(val) || 0;
}

async function updateRoundRobinIndex(sessionId, nextIndex) {
  return await client.set(`seg:scheduler:${sessionId}:index`, nextIndex);
}

module.exports = {
  client,
  setSession,
  getSession,
  deleteSession,
  getAsync,
  setAsync,
  lRangeAsync,
  getRoundRobinIndex,
  updateRoundRobinIndex,
  getUserSegmentCount,
  incrUserSegmentCount,
  delAsync,
  addUserToSession,
  removeUserFromSession,
  getSessionUsers,
};
