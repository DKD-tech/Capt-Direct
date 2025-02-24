// types.js

// Définition d'une fonction de validation pour un champ spécifique
const ValidatorFunction = (str) => typeof str === "string" && str.length > 0;

// Schéma de validation : chaque clé est associée à une fonction de validation
const ValidationSchema = {
  email: ValidatorFunction,
  password: ValidatorFunction,
};

module.exports = { ValidatorFunction, ValidationSchema };
