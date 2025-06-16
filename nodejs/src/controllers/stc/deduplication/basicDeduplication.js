/**
 * NIVEAU 1: Déduplication basique - GRATUIT & INSTANTANÉ
 * Gère les cas les plus fréquents de doublons dans les sous-titres français
 */

/**
 * Supprime les mots consécutifs identiques
 */
function removeConsecutiveDuplicates(text) {
  // Gère: "bonjour bonjour" → "bonjour"
  // Gère: "je je pense" → "je pense"
  return text.replace(/\b(\w+)(\s+\1)+\b/gi, "$1");
}

/**
 * Supprime les répétitions de groupes de mots courts (2-3 mots)
 */
function removeShortPhraseRepeats(text) {
  // Gère: "vous savez vous savez" → "vous savez"
  // Gère: "c'est à dire c'est à dire" → "c'est à dire"
  return text
    .replace(/\b(\w+\s+\w+)(\s+\1)+\b/gi, "$1") // 2 mots
    .replace(/\b(\w+\s+\w+\s+\w+)(\s+\1)+\b/gi, "$1"); // 3 mots
}

/**
 * Supprime les hésitations typiques en français
 */
function removeFillerWords(text) {
  const fillers = [
    /\b(euh|euh\s+euh|euhhh)\b/gi,
    /\b(hein|hein\s+hein)\b/gi,
    /\b(ben|ben\s+ben)\b/gi,
    /\b(donc\s+donc)\b/gi,
    /\b(alors\s+alors)\b/gi,
    /\b(voilà\s+voilà)\b/gi,
  ];

  let cleanText = text;
  fillers.forEach((pattern) => {
    cleanText = cleanText.replace(pattern, "");
  });

  return cleanText;
}

/**
 * Nettoie les espaces multiples et la ponctuation
 */
function cleanSpacingAndPunctuation(text) {
  return text
    .replace(/\s+/g, " ") // Espaces multiples → un seul
    .replace(/\s+([,.!?;:])/g, "$1") // Espace avant ponctuation
    .replace(/([,.!?;:])+/g, "$1") // Ponctuation multiple
    .trim();
}

/**
 * Fonction principale de déduplication basique
 */
function basicTextDeduplication(text) {
  if (!text || typeof text !== "string") return "";

  let cleanText = text;

  // 1. Supprimer les hésitations
  cleanText = removeFillerWords(cleanText);

  // 2. Supprimer les doublons consécutifs
  cleanText = removeConsecutiveDuplicates(cleanText);

  // 3. Supprimer les répétitions de phrases courtes
  cleanText = removeShortPhraseRepeats(cleanText);

  // 4. Nettoyer les espaces et ponctuation
  cleanText = cleanSpacingAndPunctuation(cleanText);

  return cleanText;
}

/**
 * Déduplication entre segments (cross-segment)
 * Détecte si la fin d'un segment = début du suivant
 */
function detectCrossSegmentDuplicates(segments) {
  const processedSegments = [];

  for (let i = 0; i < segments.length; i++) {
    let currentText = segments[i].text;

    if (i > 0) {
      const previousText = processedSegments[i - 1].text;
      const overlap = findTextOverlap(previousText, currentText);

      if (overlap.length > 3) {
        // Si chevauchement > 3 caractères
        currentText = currentText.substring(overlap.length).trim();
      }
    }

    processedSegments.push({
      ...segments[i],
      text: basicTextDeduplication(currentText),
    });
  }

  return processedSegments;
}

/**
 * Trouve le chevauchement entre la fin d'un texte et le début d'un autre
 */
function findTextOverlap(text1, text2) {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);

  let maxOverlap = "";

  // Tester différentes longueurs de chevauchement
  for (let len = Math.min(words1.length, words2.length); len > 0; len--) {
    const end1 = words1.slice(-len).join(" ");
    const start2 = words2.slice(0, len).join(" ");

    if (end1 === start2) {
      maxOverlap = text2.split(/\s+/).slice(0, len).join(" ");
      break;
    }
  }

  return maxOverlap;
}

// Test et exemples
function testBasicDeduplication() {
  const testCases = [
    "bonjour bonjour comment allez-vous",
    "je je pense que c'est c'est correct",
    "vous savez vous savez il faut faire attention",
    "euh ben donc donc nous allons voir",
    "c'est formidable    ,,,   vraiment   formidable",
  ];

  console.log("=== TESTS DÉDUPLICATION BASIQUE ===");
  testCases.forEach((test) => {
    console.log(`Original: "${test}"`);
    console.log(`Nettoyé:  "${basicTextDeduplication(test)}"`);
    console.log("---");
  });
}

module.exports = {
  basicTextDeduplication,
  detectCrossSegmentDuplicates,
  removeConsecutiveDuplicates,
  removeShortPhraseRepeats,
  removeFillerWords,
  testBasicDeduplication,
};
