const jwt = require("../utils/jwt"); // Ajuste le chemin selon ta structure
const Redis = require("../redis/index"); // Connexion Redis

async function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Token non fourni" });

  try {
    // Vérifie et décode le token JWT
    const userSession = await jwt.verify(token);

    if (!userSession) {
      return res.status(401).json({ error: "Token invalide" });
    }

    // Vérifie si le token existe encore dans Redis
    const storedToken = await Redis.getSession(userSession.id);

    if (!storedToken || storedToken !== token) {
      return res.status(401).json({ error: "Session expirée ou invalide" });
    }

    // Ajoute les informations de l'utilisateur décodé à la requête
    req.user = userSession;
    next();
  } catch (error) {
    console.error("JWT_ERROR", error);
    return res
      .status(401)
      .json({ error: "Erreur lors de la vérification du token" });
  }
}

module.exports = authMiddleware;
