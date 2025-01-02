const UserModel = require("../../models/UserModel");
const Redis = require("../../redis/index");

async function deleteUserController(req, res) {
  try {
    const userId = req.user.id;

    // Supprime l'utilisateur de la base de données
    await UserModel.delete(userId);

    // Supprime la session de l'utilisateur de Redis
    await Redis.deleteSession(userId);

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.sendStatus(500);
  }
}

module.exports = deleteUserController;
