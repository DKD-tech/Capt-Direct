const UserModel = require("../models/UserModel");

async function sessionController(req, res) {
  // Vérifie si l'utilisateur est authentifié
  if (!req.user) return res.sendStatus(401);

  try {
    // Récupère l'utilisateur depuis la base de données en utilisant l'ID extrait du token
    const user = await UserModel.findOneById(req.user.id);

    if (user) {
      // Si l'utilisateur est trouvé, retourne ses informations
      return res.status(200).json(user);
    } else {
      // Si l'utilisateur n'existe pas, retourne un statut 401
      return res.sendStatus(401);
    }
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de la session utilisateur :",
      error
    );
    return res.sendStatus(500);
  }
}

module.exports = sessionController;
