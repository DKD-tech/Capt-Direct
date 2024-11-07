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

module.exports = client;
