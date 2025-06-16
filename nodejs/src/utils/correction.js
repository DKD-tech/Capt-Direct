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

// Fonction principale de correction avec contexte
function correctTextWithContext(
  segmentText,
  allSegments = [],
  currentIndex = -1
) {
  // 1. Essayer de compléter un mot partiel
  const completion = completePartialWord(segmentText, words);
  if (completion && completion.confidence > 0.3) {
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

  // 2. Essayer de prédire le mot suivant
  const prediction = predictNextWordContextual(
    segmentText,
    allSegments,
    currentIndex
  );
  if (prediction && prediction.confidence > 0.5) {
    return {
      type: "prediction",
      original: segmentText,
      predicted: prediction.prediction,
      confidence: prediction.confidence,
      method: prediction.ngramType,
    };
  }

  return null;
}

function suggestCompletion(segment, wordList) {
  const words = segment.trim().toLowerCase().split(/\s+/);
  const lastWord = words[words.length - 1];

  if (!lastWord) return null;

  const suggestions = wordList.filter(
    (w) => w.startsWith(lastWord) && w.length > lastWord.length
  );

  if (suggestions.length > 0) {
    return suggestions[0]; // ou utilisez une logique plus avancée ici
  }
  return null;
}
// Exporter les fonctions
module.exports = {
  predictNextWordContextual,
  completePartialWord,
  correctTextWithContext,
  words,
  wordPositions,
  suggestCompletion,
};

// Exemple d'utilisation pour votre cas :
console.log("=== Test avec votre exemple ===");
const testSegments = [
  "Moi je le porterai dans la durant",
  "orterai dans la durée je le porterai",
];

testSegments.forEach((segment, index) => {
  console.log(`\nSegment ${index + 1}: "${segment}"`);

  const result = correctTextWithContext(segment, testSegments, index);
  if (result) {
    console.log(`Type: ${result.type}`);
    console.log(`Résultat: ${result.corrected || result.predicted}`);
    console.log(`Confiance: ${(result.confidence * 100).toFixed(1)}%`);
  } else {
    console.log("Aucune correction trouvée");
  }
});
