const { loadDictionary } = require("./utils/dictionnaryLoader");
const { suggestCorrection, isWordValid } = require("./utils/levenshtein");

const dictionary = loadDictionary();

// Test de quelques mots
console.log(dictionary.has("bonjour")); // true
console.log(dictionary.has("abaisser")); // true
console.log(dictionary.has("xyz")); // false
