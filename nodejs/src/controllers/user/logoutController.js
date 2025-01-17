const Redis = require("../../redis/index");

async function logoutController(req, res) {
  try {
    if (!req.user || !req.user.id) {
      console.log("Utilisateur non authentifié ou ID utilisateur manquant");
      return res.status(400).json({ message: "User not authenticated" });
    }
    const userId = req.user.id;
    console.log("ID utilisateur pour la déconnexion:", userId);
    // Supprime la session de l'utilisateur de Redis
    const result = await Redis.deleteSession(userId);
    console.log("Résultat de la suppression dans Redis:", result);

    if (result === 0) {
      console.warn(
        "Aucune session trouvée pour cet ID utilisateur dans Redis."
      );
      return res
        .status(400)
        .json({ message: "Session non trouvée pour cet utilisateur." });
    }

    res.status(200).json({ message: "Déconnexion réussie" });
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    res.sendStatus(500);
  }
}

module.exports = logoutController;
