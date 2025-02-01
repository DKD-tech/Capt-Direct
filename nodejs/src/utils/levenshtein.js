const fs = require("fs");
const path = require("path");
const levenshtein = require("fast-levenshtein");

const DICTIONARY_DIR = path.join(__dirname, "../data/dictionnaires");

let dictionary = new Set();
let dictionaryArray = []; // Pour un accès rapide dans l'algorithme de correction

function loadDictionary() {
  const files = fs.readdirSync(DICTIONARY_DIR);
  const wordList = new Set();

  files.forEach((file) => {
    const filePath = path.join(DICTIONARY_DIR, file);
    const lines = fs.readFileSync(filePath, "utf-8").split("\n");

    let startReading = false;
    lines.forEach((line) => {
      if (line.includes("FIN DE LA LICENCE ABU")) {
        startReading = true;
        return;
      }
      if (!startReading) return;

      const word = line.split("\t")[0]?.toLowerCase();
      if (word) {
        wordList.add(word);
      }
    });
  });

  dictionary = wordList;
  dictionaryArray = Array.from(wordList); // Convertir en tableau pour les suggestions
  console.log(`✅ Dictionnaire chargé avec ${dictionary.size} mots.`);
}

loadDictionary();

// ✅ Vérifier si un mot est valide
function isWordValid(word) {
  return dictionary.has(word.toLowerCase());
}

// ✅ Trouver la meilleure correction
function suggestCorrection(word) {
  let bestMatch = null;
  let minDistance = Infinity;

  word = word.toLowerCase();

  dictionaryArray.forEach((dictWord) => {
    const distance = levenshtein.get(word, dictWord);

    // Seuil de tolérance ajusté pour éviter des erreurs
    if (distance <= 2 && distance < minDistance) {
      minDistance = distance;
      bestMatch = dictWord;
    }
  });

  return bestMatch;
}

module.exports = { isWordValid, suggestCorrection };
