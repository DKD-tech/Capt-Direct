const xlsx = require("xlsx");
const path = require("path");
const leven = require("leven");

let dictionaryIndex = {}; // Structure indexée pour un accès rapide

/**
 * Charger le dictionnaire depuis le fichier Excel.
 */
function loadDictionary() {
  try {
    const filePath = path.join(__dirname, "../data/Lexique-query.xlsx");
    const workbook = xlsx.readFile(filePath);

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const dictionaryData = xlsx.utils.sheet_to_json(sheet);

    // Indexer les mots pour un accès rapide
    dictionaryData.forEach((entry) => {
      if (entry.Word) {
        const word = entry.Word.normalize("NFC"); // Normaliser pour conserver les accents
        dictionaryIndex[word.toLowerCase()] = {
          phon: entry.phon,
          lemme: entry.lemme,
          cgram: entry.cgram,
          frequency: entry.freqlemfilms2,
        };
      }
    });

    console.log(
      `Dictionnaire chargé avec succès : ${Object.keys(dictionaryIndex).length} mots.`
    );
  } catch (error) {
    console.error("Erreur lors du chargement du dictionnaire :", error);
  }
}

/**
 * Valider un mot en utilisant le dictionnaire.
 * @param {string} word - Le mot à valider.
 * @returns {object} Résultat de la validation.
 */
function validateWord(word) {
  const normalizedWord = word.normalize("NFC").toLowerCase(); // Normaliser pour conserver les accents
  if (dictionaryIndex[normalizedWord]) {
    return { valid: true, data: dictionaryIndex[normalizedWord] };
  } else {
    return { valid: false, suggestion: null };
  }
}

/**
 * Obtenir une suggestion pour un mot invalide.
 * @param {string} word - Le mot invalide.
 * @returns {string|null} Proposition de correction ou null.
 */
function getSuggestion(word) {
  const lowerWord = word.toLowerCase();

  let closestWord = null;
  let minDistance = Infinity;

  Object.keys(dictionaryIndex).forEach((dictWord) => {
    const distance = leven(lowerWord, dictWord.toLowerCase());
    if (distance < minDistance) {
      minDistance = distance;
      closestWord = dictWord;
    }
  });

  // Retourner la suggestion uniquement si elle est suffisamment proche
  return minDistance <= 2 ? closestWord : null; // Ajustez le seuil de tolérance si nécessaire
}

  
// Charger le dictionnaire au démarrage
loadDictionary();

module.exports = {
  validateWord,
  getSuggestion,
};
