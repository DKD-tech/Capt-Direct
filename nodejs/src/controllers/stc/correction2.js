const fs = require("fs");

// Charger le JSON contenant le texte source
const path = require("path");
const jsonData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../data/nlp.json"), "utf8")
);

// Extraire le texte et le convertir en minuscule pour uniformiser
const texte = jsonData.contenu.join(" ").toLowerCase();

// Créer un index de positions pour chaque mot dans le texte complet
function createWordPositionIndex(text) {
  const words = text.split(/\s+/);
  const wordPositions = {};

  words.forEach((word, index) => {
    if (!wordPositions[word]) {
      wordPositions[word] = [];
    }
    wordPositions[word].push(index);
  });

  return { words, wordPositions };
}

// Fonction pour générer des n-grams avec positions
function generateNGramsWithPositions(words, n) {
  let ngrams = {};
  for (let i = 0; i <= words.length - n; i++) {
    let gram = words.slice(i, i + n).join(" ");
    if (!ngrams[gram]) {
      ngrams[gram] = [];
    }
    ngrams[gram].push({
      position: i,
      frequency: 1,
      nextWord: words[i + n] || null,
    });
  }

  // Calculer les fréquences
  Object.keys(ngrams).forEach((gram) => {
    ngrams[gram] = {
      occurrences: ngrams[gram],
      totalFreq: ngrams[gram].length,
    };
  });

  return ngrams;
}

// Transformer le texte en tableau de mots
const { words, wordPositions } = createWordPositionIndex(texte);

// Générer les n-grams avec contexte
const bigramsWithContext = generateNGramsWithPositions(words, 2);
const trigramsWithContext = generateNGramsWithPositions(words, 3);
const quadgramsWithContext = generateNGramsWithPositions(words, 4);

// Fonction pour trouver la position approximative dans le texte source
function findApproximatePosition(segmentText, allWords) {
  const segmentWords = segmentText.toLowerCase().split(/\s+/);
  if (segmentWords.length === 0) return -1;

  const firstWord = segmentWords[0];
  const secondWord = segmentWords[1];

  // Chercher des séquences de mots correspondantes
  for (let i = 0; i < allWords.length - segmentWords.length; i++) {
    let matchCount = 0;
    for (let j = 0; j < Math.min(segmentWords.length, 3); j++) {
      if (allWords[i + j] === segmentWords[j]) {
        matchCount++;
      }
    }

    // Si on a au moins 2 mots qui correspondent
    if (matchCount >= 2) {
      return i;
    }
  }

  return -1;
}

// Fonction de prédiction contextuelle améliorée
function predictNextWordContextual(
  segmentText,
  allSegments = [],
  currentSegmentIndex = -1
) {
  const segmentWords = segmentText.toLowerCase().split(/\s+/);

  // Estimer la position dans le texte source
  const approximatePosition = findApproximatePosition(segmentText, words);

  // Essayer différentes longueurs de n-grammes (du plus long au plus court)
  const ngramModels = [
    { model: quadgramsWithContext, n: 4 },
    { model: trigramsWithContext, n: 3 },
    { model: bigramsWithContext, n: 2 },
  ];

  for (const { model, n } of ngramModels) {
    if (segmentWords.length >= n - 1) {
      const lastWords = segmentWords.slice(-(n - 1)).join(" ");

      // Chercher tous les n-grammes qui commencent par ces mots
      const matchingGrams = Object.keys(model).filter((gram) =>
        gram.startsWith(lastWords)
      );

      if (matchingGrams.length > 0) {
        // Trier par pertinence contextuelle
        const sortedGrams = matchingGrams
          .map((gram) => {
            const gramData = model[gram];
            let contextScore = 0;

            // Bonus pour les n-grammes proches de la position estimée
            if (approximatePosition >= 0) {
              gramData.occurrences.forEach((occurrence) => {
                const distance = Math.abs(
                  occurrence.position - approximatePosition
                );
                contextScore += Math.max(0, 100 - distance / 10);
              });
            }

            return {
              gram,
              data: gramData,
              contextScore: contextScore + gramData.totalFreq,
              nextWord: gramData.occurrences[0]?.nextWord,
            };
          })
          .sort((a, b) => b.contextScore - a.contextScore);

        // Retourner le meilleur candidat
        const bestMatch = sortedGrams[0];
        if (bestMatch.nextWord) {
          return {
            prediction: bestMatch.nextWord,
            confidence: bestMatch.contextScore / 100,
            ngram: bestMatch.gram,
            ngramType: `${n}-gram`,
          };
        }
      }
    }
  }

  return null;
}

// Fonction pour compléter un mot partiellement écrit
function completePartialWord(partialText, allWords) {
  const words = partialText.toLowerCase().split(/\s+/);
  const lastWord = words[words.length - 1];

  if (lastWord.length < 2) return null;

  // Chercher des mots qui commencent par le mot partiel
  const candidates = allWords.filter(
    (word) => word.startsWith(lastWord) && word.length > lastWord.length
  );

  if (candidates.length === 0) return null;

  // Compter les fréquences
  const frequencies = {};
  candidates.forEach((word) => {
    frequencies[word] = (frequencies[word] || 0) + 1;
  });

  // Retourner le plus fréquent
  const bestCandidate = Object.keys(frequencies).sort(
    (a, b) => frequencies[b] - frequencies[a]
  )[0];

  return {
    completion: bestCandidate,
    original: lastWord,
    confidence: frequencies[bestCandidate] / candidates.length,
  };
}

// ==========================================
// 🚨 NOUVELLES FONCTIONS CRITIQUES
// ==========================================

function isWordComplete(word) {
  if (!word || word.trim().length === 0) return false;

  const cleanWord = word.toLowerCase().replace(/[^\w]/g, "");

  // Vérifier dans le dictionnaire de mots (même source que les n-grams)
  const exists = words.includes(cleanWord);
  console.log(`🔍 Mot "${cleanWord}" existe dans le dictionnaire: ${exists}`);

  return exists;
}

function hasNaturalRepetition(text) {
  const textWords = text.toLowerCase().trim().split(/\s+/);
  if (textWords.length < 4) return false;

  // Chercher des répétitions de 2-4 mots consécutifs
  for (let seqLength = 2; seqLength <= 4; seqLength++) {
    for (let i = 0; i <= textWords.length - seqLength; i++) {
      const sequence = textWords.slice(i, i + seqLength).join(" ");

      // Chercher cette séquence plus tard dans le texte
      for (let j = i + seqLength; j <= textWords.length - seqLength; j++) {
        const laterSequence = textWords.slice(j, j + seqLength).join(" ");

        if (sequence === laterSequence && sequence.length > 3) {
          console.log(`🔄 Répétition naturelle détectée: "${sequence}"`);
          return true;
        }
      }
    }
  }

  return false;
}

function hasIncompleteWord(text) {
  const textWords = text.trim().split(/\s+/);
  const lastWord = textWords[textWords.length - 1];

  // Un mot est considéré comme incomplet s'il:
  // 1. Fait moins de 3 caractères ET n'existe pas dans le dictionnaire
  // 2. OU se termine par une voyelle isolée (souvent signe d'incomplétude)
  const isShortAndUnknown = lastWord.length < 3 && !isWordComplete(lastWord);
  const endsWithIsolatedVowel =
    lastWord.match(/[aeiou]$/i) &&
    lastWord.length < 4 &&
    !isWordComplete(lastWord);

  return isShortAndUnknown || endsWithIsolatedVowel;
}

function isPhraseComplete(text) {
  if (!text || text.trim().length === 0) return false;

  const trimmedText = text.trim();
  const textWords = trimmedText.split(/\s+/);

  console.log(`📝 Analyse de complétude pour "${trimmedText}":`, {
    mots: textWords.length,
    dernierMot: textWords[textWords.length - 1],
  });

  // Critères de complétude
  const hasMinimumWords = textWords.length >= 5;
  const lastWordComplete = isWordComplete(textWords[textWords.length - 1]);
  const hasRepetition = hasNaturalRepetition(trimmedText);
  const hasPunctuation = trimmedText.match(/[.!?]$/);

  console.log(`🔍 Critères:`, {
    mots_suffisants: hasMinimumWords,
    dernier_mot_valide: lastWordComplete,
    repetition_naturelle: hasRepetition,
    ponctuation: !!hasPunctuation,
  });

  // Une phrase est complète si:
  // 1. Elle se termine par ponctuation OU
  // 2. Elle a assez de mots ET (dernier mot valide OU répétition naturelle)
  const isComplete =
    hasPunctuation || (hasMinimumWords && (lastWordComplete || hasRepetition));

  console.log(`✅ Résultat: ${isComplete ? "COMPLÈTE" : "INCOMPLÈTE"}`);
  return isComplete;
}

// ==========================================
// 🚨 FONCTION PRINCIPALE CORRIGÉE
// ==========================================

function correctTextWithContext(
  segmentText,
  allSegments = [],
  currentIndex = -1
) {
  console.log(`🧠 Correction contextuelle pour: "${segmentText}"`);

  // ✅ ÉTAPE 1: Vérifier d'abord si la phrase est complète
  if (isPhraseComplete(segmentText)) {
    console.log(
      `✅ Phrase considérée comme complète, aucune correction nécessaire`
    );
    return null; // 🚨 CRITIQUE: retourner null, pas false
  }

  // ✅ ÉTAPE 2: Essayer de compléter un mot partiel SEULEMENT s'il y en a un
  if (hasIncompleteWord(segmentText)) {
    console.log(`🔧 Tentative de complétion d'un mot incomplet`);
    const completion = completePartialWord(segmentText, words);
    if (completion && completion.confidence > 0.5) {
      const correctedText = segmentText.replace(
        new RegExp(completion.original + "$"),
        completion.completion
      );
      return {
        type: "completion",
        original: segmentText,
        corrected: correctedText,
        confidence: completion.confidence,
      };
    }
  }

  // ✅ ÉTAPE 3: Prédiction seulement si vraiment nécessaire
  console.log(`🤔 Tentative de prédiction du mot suivant`);
  const prediction = predictNextWordContextual(
    segmentText,
    allSegments,
    currentIndex
  );

  if (prediction && prediction.confidence > 0.8) {
    // Vérification anti-duplication
    const segmentWords = segmentText.toLowerCase().split(/\s+/);
    const lastWord = segmentWords[segmentWords.length - 1];

    if (prediction.prediction !== lastWord) {
      return {
        type: "prediction",
        original: segmentText,
        predicted: prediction.prediction,
        confidence: prediction.confidence,
        method: prediction.ngramType,
      };
    } else {
      console.log(`🛑 Éviter la duplication du mot "${lastWord}"`);
    }
  }

  console.log(`❌ Aucune correction/prédiction appropriée trouvée`);
  return null;
}

// Exporter les fonctions
module.exports = {
  predictNextWordContextual,
  completePartialWord,
  correctTextWithContext,
  isPhraseComplete,
  isWordComplete,
  hasNaturalRepetition,
  words,
  wordPositions,
};

// ==========================================
// 🧪 TEST AVEC VOTRE EXEMPLE
// ==========================================

console.log("=== Test avec votre exemple ===");
const testText = "Moi je le porterai dans la durée je le porterai";

console.log(`\n🧪 Test: "${testText}"`);
const result = correctTextWithContext(testText, [], 0);

if (result === null) {
  console.log(
    `✅ SUCCÈS: Aucune correction appliquée, phrase reconnue comme complète`
  );
  console.log(`📌 Texte final: "${testText}"`);
} else {
  console.log(`❌ ÉCHEC: Une correction a été appliquée`);
  console.log(`Type: ${result.type}`);
  console.log(`Résultat: ${result.corrected || result.predicted}`);
}
