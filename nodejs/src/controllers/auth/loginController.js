require("dotenv").config();
const jwt = require("../../utils/jwt"); // Adapte le chemin selon la structure de ton projet
const bcrypt = require("bcrypt");
const UserModel = require("../../models/UserModel"); // Utilise le modèle utilisateur
const Redis = require("../../redis/index"); // Connexion Redis

async function loginController(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  try {
    const user = await UserModel.findByEmail(email);

    if (user) {
      console.log("Utilisateur récupéré:", user);
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      // Générer le token JWT
      const token = await jwt.sign({
        id: user.user_id,
        username: user.username,
      });

      console.log("ID utilisateur pour setSession:", user.user_id);
      // Stocker la session dans Redis
      await Redis.setSession(user.user_id, token, 7 * 24 * 60 * 60);

      res.status(200).json({ token });
    } else {
      return res.status(400).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
}

module.exports = loginController;
