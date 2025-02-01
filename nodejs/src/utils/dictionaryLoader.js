// utils/levenshtein.js
const fs = require("fs");
const path = require("path");
const leven = require("leven");

// Chemin vers ton dossier de dico
const DICTIONARY_DIR = path.join(__dirname, "../data/dictionnaires");

// Map { mot -> { frequency } }
let dictionary = new Map();
let wordList = [];

/**
 * Chargement du dictionnaire
 */
function loadDictionary() {
  try {
    const files = fs.readdirSync(DICTIONARY_DIR);

    files.forEach((file) => {
      const filePath = path.join(DICTIONARY_DIR, file);
      const lines = fs.readFileSync(filePath, "utf-8").split("\n");

      for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const parts = trimmed.split("\t");
        const rawWord = parts[0]?.toLowerCase();

        // Filtrer caractères bizarres
        if (!/^[a-zàâçéèêëîïôûùüÿñæœ'-]+$/i.test(rawWord)) {
          continue;
        }

        // Fréquence par défaut
        let frequency = 1;

        // (Optionnel) punir un mot spécifique, ex. "voua"
        // if (rawWord === "voua") {
        //   frequency = 0;
        // }

        dictionary.set(rawWord, { frequency });
        wordList.push(rawWord);
      }
    });

    console.log(`✅ Dico chargé : ${dictionary.size} mots.`);
  } catch (error) {
    console.error("❌ Erreur chargement du dico :", error);
  }
}

// Appel au chargement dès le début
loadDictionary();

/**
 * Nettoyage ponctuation (début/fin) + toLowerCase
 */
function cleanWord(word) {
  return word
    .toLowerCase()
    .replace(/^[^a-zàâçéèêëîïôûùüÿñæœ]+|[^a-zàâçéèêëîïôûùüÿñæœ'-]+$/gi, "");
}

/**
 * Vérifie si un mot (après nettoyage) est dans la Map
 */
function isWordValid(word) {
  return dictionary.has(cleanWord(word));
}

/**
 * Calcule la longueur du préfixe commun (lettres identiques dès le début)
 */
function computePrefixSimilarity(wordA, wordB) {
  let prefixLength = 0;
  const minLen = Math.min(wordA.length, wordB.length);
  for (let i = 0; i < minLen; i++) {
    if (wordA[i] === wordB[i]) {
      prefixLength++;
    } else {
      break;
    }
  }
  return prefixLength;
}

/**
 * Calcule un score basé sur :
 *  - Distance de Levenshtein (pénalisée)
 *  - Bonus de préfixe
 *  - Bonus de fréquence
 */
function computeScore(cleanedWord, dictWord, frequency) {
  const distance = leven(cleanedWord, dictWord);

  // Pénalisation distance
  const scoreDistance = -distance * 2;

  // Bonus préfixe
  const prefixLen = computePrefixSimilarity(cleanedWord, dictWord);

  // Fraction de la fréquence
  const scoreFreq = frequency / 5; // ajustable

  return scoreDistance + prefixLen + scoreFreq;
}

/**
 * Suggestion orthographique
 * 1) Nettoie le mot
 * 2) Filtre :
 *    - même 1ère lettre
 *    - longueur ±2
 *    - distance ≤2
 * 3) Calcule le score
 * 4) Gère l'égalité avec un tie-break sur le préfixe,
 *    puis éventuellement la longueur du mot (ou ordre alphabétique).
 */
function suggestCorrection(inputWord) {
  const cleaned = cleanWord(inputWord);
  let bestMatch = null;
  let bestScore = -Infinity;
  let bestPrefix = 0; // pour tie-break

  console.log(`\n[DEBUG] Correction pour "${cleaned}" :`);

  for (const dictWord of wordList) {
    // Filtre : 1ère lettre identique
    if (dictWord[0] !== cleaned[0]) {
      continue;
    }

    // Filtre : diff de longueur <= 2
    if (Math.abs(dictWord.length - cleaned.length) > 2) {
      continue;
    }

    // Distance ≤ 2
    const distance = leven(cleaned, dictWord);
    if (distance > 2) {
      continue;
    }

    // Calcul du score
    const { frequency } = dictionary.get(dictWord) || { frequency: 0 };
    const totalScore = computeScore(cleaned, dictWord, frequency);
    const prefixLen = computePrefixSimilarity(cleaned, dictWord);

    console.log(`candidate="${dictWord}", dist=${distance}, freq=${frequency}, prefix=${prefixLen}, totalScore=${totalScore}`);

    // Choix du meilleur
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestMatch = dictWord;
      bestPrefix = prefixLen;
    } else if (totalScore === bestScore) {
      // TIE-BREAK 1 : on compare le prefixLen
      if (prefixLen > bestPrefix) {
        bestMatch = dictWord;
        bestPrefix = prefixLen;
      } else if (prefixLen === bestPrefix) {
        // TIE-BREAK 2 : on peut préférer le mot le plus court
        // (ou un autre critère, par ex. ordre alphabétique)

        // Ex : critère "mot le plus court"
        if (dictWord.length < bestMatch.length) {
          bestMatch = dictWord;
          bestPrefix = prefixLen;
        }

        // Ou, critère "ordre alphabétique"
        // if (dictWord < bestMatch) {
        //   bestMatch = dictWord;
        //   bestPrefix = prefixLen;
        // }
      }
    }
  }

  console.log(`[DEBUG] => BEST MATCH = "${bestMatch}" (score=${bestScore})\n`);
  return bestMatch;
}

// Exports
module.exports = {
  isWordValid,
  suggestCorrection,
  cleanWord,
  dictionary,
};
