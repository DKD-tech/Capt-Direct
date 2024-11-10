const bcrypt = require("bcrypt");
const jwt = require("../../utils/jwt"); // Adapte le chemin selon la structure de ton projet
const validate = require("../../helpers/validation/validate");
const userSchema = require("../../helpers/schemas/userSchema");
const UserModel = require("../../models/UserModel");
const Redis = require("../../redis/index");
const getRandomString = require("../../utils/getRandomString"); // Fonction pour générer un pseudo unique

async function signUpController(req, res) {
  const { email, password, username, role } = req.body;

  // Validation des données d'inscription
  const validation = validate({ email, password, username, role }, userSchema);
  if (!validation.isValid) {
    return res.status(400).send(`Invalid ${validation.invalidKey}`);
  }

  try {
    // Vérifie si l'email est déjà utilisé
    const existingUser = await UserModel.findOneBy({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hachage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crée un utilisateur avec un nom d'utilisateur aléatoire si non fourni
    const finalUsername =
      username || `${email.split("@")[0]}${getRandomString(5)}`;

    // Insertion de l'utilisateur dans la base de données
    const createdUser = await UserModel.insert({
      username: finalUsername,
      email,
      password: hashedPassword,
      role: role || "viewer", // Rôle par défaut
      created_at: new Date(), // Ajout de la date de création
    });

    // Génération et enregistrement du token JWT
    const token = await jwt.sign({ id: createdUser.user_id });
    await Redis.setSession(createdUser.user_id, token);

    res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
}

module.exports = signUpController;
