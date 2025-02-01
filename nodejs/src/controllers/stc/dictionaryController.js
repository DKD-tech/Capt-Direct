// controllers/dictionaryController.js

const { isWordValid, suggestCorrection } = require("../../utils/dictionaryLoader");
// (ou "../utils/dictionaryLoader" selon le nom exact de ton module)

exports.validateWord = (req, res) => {
  // Première version (tout en minuscules + direct)
  // const word = req.params.word.toLowerCase();
  // const isValid = isWordValid(word);
  // return res.json({ word, isValid });

  // OU deuxième version (avec "word" brut puis "cleanWord" dedans)
  const { word } = req.params;
  if (!word) {
    return res.status(400).json({ message: "Un mot est requis." });
  }

  // isWordValid s'occupe déjà du nettoyage (ou tu peux .toLowerCase() si tu veux)
  const isValid = isWordValid(word);

  return res.json({ word, isValid });
};

exports.validateText = (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ message: "Le texte est requis." });
  }

  // On découpe le texte en mots
  const words = text.split(/\s+/);
  const invalidWords = [];
  const corrections = [];

  words.forEach((word) => {
    if (!isWordValid(word)) {
      invalidWords.push(word);
      const suggestion = suggestCorrection(word);

      corrections.push({
        word,
        suggestion: suggestion || "Aucune suggestion disponible",
      });
    }
  });

  if (invalidWords.length > 0) {
    return res.status(200).json({
      message: "Texte partiellement valide.",
      invalidWords,
      corrections,
    });
  }

  return res.status(200).json({
    message: "Texte valide.",
  });
};

exports.suggestWord = (req, res) => {
  const { word } = req.params;
  if (!word) {
    return res.status(400).json({ message: "Un mot est requis." });
  }

  const suggestion = suggestCorrection(word);

  if (suggestion) {
    return res.status(200).json({
      message: "Suggestion trouvée.",
      suggestion,
    });
  }

  return res.status(404).json({
    message: "Aucune suggestion trouvée.",
  });
};
