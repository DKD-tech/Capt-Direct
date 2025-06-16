/**
 * NIVEAU 2: Déduplication intermédiaire - GRATUIT & INSTANTANÉ
 * Utilise une fenêtre glissante pour détecter des patterns plus complexes
 */

/**
 * Calcule la similarité entre deux chaînes (Jaccard)
 */
function jaccardSimilarity(str1, str2) {
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Calcule la distance de Levenshtein (gratuit, sans librairie)
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Déduplication par fenêtre glissante
 */
function slidingWindowDeduplication(text, windowSize = 5, threshold = 0.7) {
  const words = text.split(/\s+/);
  const cleanedWords = [];

  for (let i = 0; i < words.length; i++) {
    let isDuplicate = false;

    // Vérifier dans la fenêtre précédente
    const windowStart = Math.max(0, i - windowSize);
    const windowEnd = i;

    for (let j = windowStart; j < windowEnd; j++) {
      const currentWord = words[i].toLowerCase();
      const previousWord = words[j].toLowerCase();

      // Similarité exacte ou très proche
      if (currentWord === previousWord) {
        isDuplicate = true;
        break;
      }

      // Similarité avec distance de Levenshtein pour typos
      if (currentWord.length > 3 && previousWord.length > 3) {
        const distance = levenshteinDistance(currentWord, previousWord);
        const similarity =
          1 - distance / Math.max(currentWord.length, previousWord.length);

        if (similarity > threshold) {
          isDuplicate = true;
          break;
        }
      }
    }

    if (!isDuplicate) {
      cleanedWords.push(words[i]);
    }
  }

  return cleanedWords.join(" ");
}

/**
 * Détecte et supprime les patterns répétitifs complexes
 */
function detectRepeatingPatterns(text) {
  const words = text.split(/\s+/);
  const patterns = new Map();

  // Chercher des patterns de 2 à 5 mots
  for (let patternLength = 2; patternLength <= 5; patternLength++) {
    for (let i = 0; i <= words.length - patternLength; i++) {
      const pattern = words
        .slice(i, i + patternLength)
        .join(" ")
        .toLowerCase();

      if (!patterns.has(pattern)) {
        patterns.set(pattern, []);
      }
      patterns.get(pattern).push(i);
    }
  }

  // Identifier les patterns répétés
  const repeatedPatterns = [];
  patterns.forEach((positions, pattern) => {
    if (positions.length > 1) {
      repeatedPatterns.push({
        pattern,
        positions,
        length: pattern.split(" ").length,
      });
    }
  });

  // Trier par longueur (les plus longs d'abord)
  repeatedPatterns.sort((a, b) => b.length - a.length);

  // Supprimer les répétitions
  const wordsToRemove = new Set();

  repeatedPatterns.forEach(({ positions, length }) => {
    // Garder la première occurrence, supprimer les autres
    for (let i = 1; i < positions.length; i++) {
      const startPos = positions[i];
      for (let j = 0; j < length; j++) {
        wordsToRemove.add(startPos + j);
      }
    }
  });

  // Reconstruire le texte sans les mots supprimés
  const cleanedWords = words.filter((_, index) => !wordsToRemove.has(index));
  return cleanedWords.join(" ");
}

/**
 * Déduplication contextuelle pour phrases similaires
 */
function contextualDeduplication(segments, similarityThreshold = 0.6) {
  const processedSegments = [];

  for (let i = 0; i < segments.length; i++) {
    let shouldKeep = true;

    // Comparer avec les segments précédents proches
    for (let j = Math.max(0, i - 3); j < i; j++) {
      const similarity = jaccardSimilarity(segments[i].text, segments[j].text);

      if (similarity > similarityThreshold) {
        // Si très similaire, on garde le plus long
        if (segments[i].text.length <= segments[j].text.length) {
          shouldKeep = false;
          break;
        }
      }
    }

    if (shouldKeep) {
      processedSegments.push({
        ...segments[i],
        text: segments[i].text,
      });
    }
  }

  return processedSegments;
}

/**
 * Fonction principale de déduplication intermédiaire
 */
function intermediateTextDeduplication(text, options = {}) {
  const {
    windowSize = 5,
    threshold = 0.7,
    enablePatternDetection = true,
    enableSlidingWindow = true,
  } = options;

  if (!text || typeof text !== "string") return "";

  let cleanText = text;

  // 1. Déduplication basique d'abord
  const { basicTextDeduplication } = require("./basicDeduplication");
  cleanText = basicTextDeduplication(cleanText);

  // 2. Fenêtre glissante
  if (enableSlidingWindow) {
    cleanText = slidingWindowDeduplication(cleanText, windowSize, threshold);
  }

  // 3. Détection de patterns répétitifs
  if (enablePatternDetection) {
    cleanText = detectRepeatingPatterns(cleanText);
  }

  return cleanText.trim();
}

/**
 * Déduplication complète pour segments SRT
 */
function deduplicateSrtSegments(segments, options = {}) {
  const {
    enableCrossSegment = true,
    enableContextual = true,
    contextualThreshold = 0.6,
  } = options;

  // 1. Déduplication intra-segment
  let processedSegments = segments.map((segment) => ({
    ...segment,
    text: intermediateTextDeduplication(segment.text, options),
  }));

  // 2. Déduplication cross-segment
  if (enableCrossSegment) {
    const { detectCrossSegmentDuplicates } = require("./basicDeduplication");
    processedSegments = detectCrossSegmentDuplicates(processedSegments);
  }

  // 3. Déduplication contextuelle
  if (enableContextual) {
    processedSegments = contextualDeduplication(
      processedSegments,
      contextualThreshold
    );
  }

  // 4. Filtrer les segments vides
  return processedSegments.filter((segment) => segment.text.trim().length > 0);
}

// Tests
function testIntermediateDeduplication() {
  const testCases = [
    "je pense vraiment je pense que c'est important vraiment important",
    "nous devons nous devons faire attention à ces détails ces détails importants",
    "bonjour tout le monde bonjour comment allez-vous tout le monde",
    "c'est formidable c'est vraiment formidable cette solution cette solution",
  ];

  console.log("=== TESTS DÉDUPLICATION INTERMÉDIAIRE ===");
  testCases.forEach((test) => {
    console.log(`Original: "${test}"`);
    console.log(`Nettoyé:  "${intermediateTextDeduplication(test)}"`);
    console.log("---");
  });
}

module.exports = {
  intermediateTextDeduplication,
  deduplicateSrtSegments,
  slidingWindowDeduplication,
  detectRepeatingPatterns,
  contextualDeduplication,
  jaccardSimilarity,
  levenshteinDistance,
  testIntermediateDeduplication,
};
