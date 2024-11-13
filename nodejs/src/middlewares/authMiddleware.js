const jwt = require("../utils/jwt"); // Ajuste le chemin selon ta structure
const Redis = require("../redis/index"); // Connexion Redis

async function authMiddleware(req, res, next) {
  console.log("Middleware authMiddleware démarré");

  const authHeader = req.headers["authorization"];
  console.log("En-tête Authorization:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error("Erreur: Token non fourni ou mal formaté"); // Log d'erreur explicite
    return res.status(401).json({ error: "Token non fourni ou mal formaté" });
  }

  const token = authHeader.split(" ")[1];
  console.log("Token extrait:", token);

  // if (!token) return res.status(401).json({ error: "Token non fourni" });

  try {
    // Vérifie et décode le token JWT
    const userSession = await jwt.verify(token);
    if (!userSession) {
      console.error("Erreur: Token invalide ou ID utilisateur manquant");
      return res.status(401).json({ error: "Token invalide ou expiré" });
    }

    // Ajoutez un log pour vérifier l'ID de l'utilisateur extrait
    console.log("ID utilisateur extrait du JWT:", userSession.id);

    // Vérifie si le token existe encore dans Redis
    const storedToken = await Redis.getSession(userSession.id);
    console.log("Token stocké dans Redis:", storedToken);

    // Ajoutez un log pour vérifier la clé utilisée dans Redis
    console.log("Clé utilisée pour Redis:", userSession.id);

    // Ajoutez un log pour comparer le token reçu et celui stocké
    console.log("Token reçu:", token);

    if (!storedToken || storedToken !== token) {
      console.error("Erreur: Session expirée ou invalide");
      return res.status(401).json({ error: "Session expirée ou invalide" });
    }

    // Ajoute les informations de l'utilisateur décodé à la requête
    req.user = userSession;
    console.log("Utilisateur attaché à la requête:", req.user);

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      console.error("Erreur: Token expiré");
      return res.status(401).json({ error: "Token expiré" });
    }
    console.error("Erreur lors de la vérification du token:", error);
    return res
      .status(401)
      .json({ error: "Erreur lors de la vérification du token" });
  }
}

module.exports = authMiddleware;
