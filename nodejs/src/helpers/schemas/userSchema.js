// userSchema.js
const validator = require("validator");

const userSchema = {
  email: validator.isEmail, // Valide l'email
  password: (str) =>
    typeof str === "string" && validator.isLength(str, { min: 6 }), // Minimum de 6 caractères pour le mot de passe
  username: (str) =>
    typeof str === "string" && validator.isLength(str, { min: 3 }), // Username avec au moins 3 caractères
  role: (str) => ["admin", "editor", "viewer"].includes(str), // Role accepté dans une liste de rôles (exemple)
};

module.exports = userSchema;
