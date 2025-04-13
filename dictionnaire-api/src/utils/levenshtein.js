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
  let candidates = [];

  DICTIONNAIRE.forEach((dictWord) => {
    const distance = levenshtein.get(word.toLowerCase(), dictWord);

    if (distance < minDistance && distance <= 2) {
      minDistance = distance;
      bestMatch = dictWord;
      candidates = [dictWord]; // Réinitialise la liste des candidats
    } else if (distance === minDistance) {
      candidates.push(dictWord); // Ajoute un autre mot avec la même distance
    }
  });

  // Privilégier les mots les plus fréquents ou les plus proches phonétiquement
  if (candidates.length > 1) {
    bestMatch = candidates.find((w) => w.startsWith(word[0])) || candidates[0];
  }

  return { suggestion: bestMatch, distance: minDistance };
}

module.exports = { isWordValid, suggestCorrection };
