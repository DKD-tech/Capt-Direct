const Redis = require("../../redis/index");

async function logoutController(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(400).json({ message: "User not authenticated" });
    }
    const userId = req.user.id;

    // Supprime la session de l'utilisateur de Redis
    await Redis.deleteSession(userId);

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error logging out:", error);
    res.sendStatus(500);
  }
}

module.exports = logoutController;
