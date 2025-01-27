const levenshtein = require("fast-levenshtein");
const { DICTIONNAIRE } = require("./dictionnaryLoader");

// Vérifiez si le dictionnaire est chargé
console.log(`Dictionnaire contient ${DICTIONNAIRE.size} mots.`);

// Vérifier si un mot est valide
function isWordValid(word) {
  return DICTIONNAIRE.has(word.toLowerCase());
}

// Suggérer une correction basée sur la distance Levenshtein
function suggestCorrection(word) {
  let bestMatch = null;
  let minDistance = Infinity;

  DICTIONNAIRE.forEach((dictWord) => {
    const distance = levenshtein.get(word.toLowerCase(), dictWord);
    if (distance < minDistance && distance <= 2) {
      // Limite à une distance de 2
      minDistance = distance;
      bestMatch = dictWord;
    }
  });

  console.log(
    `Suggestion pour "${word}" : "${bestMatch}" avec une distance de ${minDistance}`
  );
  return { suggestion: bestMatch, distance: minDistance };
}

module.exports = { isWordValid, suggestCorrection };
