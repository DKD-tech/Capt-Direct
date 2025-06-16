/**
 * Calcule la similarité de Jaccard entre deux textes
 */
function jaccardSimilarity(text1, text2) {
  const words1 = new Set(
    text1
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 0)
  );
  const words2 = new Set(
    text2
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 0)
  );

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Détecte et supprime les répétitions en fin/début de phrases consécutives
 */
function removeSequentialDuplicates(texts) {
  if (texts.length <= 1) return texts;

  const cleaned = [texts[0]];

  for (let i = 1; i < texts.length; i++) {
    const current = texts[i];
    const previous = cleaned[cleaned.length - 1];

    // Diviser en mots pour comparaison
    const currentWords = current.split(/\s+/);
    const previousWords = previous.split(/\s+/);

    // Chercher le chevauchement entre la fin du précédent et le début du courant
    let overlapLength = 0;
    const maxOverlap = Math.min(currentWords.length, previousWords.length);

    for (let j = 1; j <= maxOverlap; j++) {
      const endOfPrevious = previousWords.slice(-j).join(" ").toLowerCase();
      const startOfCurrent = currentWords.slice(0, j).join(" ").toLowerCase();

      if (endOfPrevious === startOfCurrent) {
        overlapLength = j;
      }
    }

    // Si on trouve un chevauchement, on supprime la partie répétée du texte courant
    if (overlapLength > 0) {
      const cleanedCurrent = currentWords.slice(overlapLength).join(" ");
      if (cleanedCurrent.trim()) {
        cleaned.push(cleanedCurrent);
      }
    } else {
      cleaned.push(current);
    }
  }

  return cleaned;
}

/**
 * Fusionne des textes similaires avec déduplication intelligente
 */
function deduplicateSubtitles(subtitleTexts, similarityThreshold = 0.3) {
  if (!subtitleTexts || subtitleTexts.length === 0) return [];

  // Première passe : supprimer les répétitions séquentielles
  const sequentiallyClean = removeSequentialDuplicates(subtitleTexts);

  // Deuxième passe : utiliser Jaccard pour identifier les similarités
  const deduplicated = [];
  const used = new Set();

  for (let i = 0; i < sequentiallyClean.length; i++) {
    if (used.has(i)) continue;

    let currentText = sequentiallyClean[i];
    used.add(i);

    // Chercher des textes similaires à fusionner
    for (let j = i + 1; j < sequentiallyClean.length; j++) {
      if (used.has(j)) continue;

      const similarity = jaccardSimilarity(currentText, sequentiallyClean[j]);

      if (similarity > similarityThreshold) {
        // Fusionner intelligemment (garder le plus long ou combiner)
        const combined = smartMerge(currentText, sequentiallyClean[j]);
        currentText = combined;
        used.add(j);
      }
    }

    if (currentText.trim()) {
      deduplicated.push(currentText.trim());
    }
  }

  return deduplicated;
}

/**
 * Fusionne intelligemment deux textes similaires
 */
function smartMerge(text1, text2) {
  // Si un texte contient complètement l'autre, garder le plus long
  if (text1.toLowerCase().includes(text2.toLowerCase())) {
    return text1;
  }
  if (text2.toLowerCase().includes(text1.toLowerCase())) {
    return text2;
  }

  // Sinon, combiner en évitant les répétitions
  const words1 = text1.split(/\s+/);
  const words2 = text2.split(/\s+/);

  // Trouver le meilleur point de fusion
  let bestMerge = text1 + " " + text2;
  let minLength = bestMerge.length;

  // Essayer différents points de chevauchement
  for (let i = 1; i <= Math.min(words1.length, words2.length); i++) {
    const end1 = words1.slice(-i).join(" ").toLowerCase();
    const start2 = words2.slice(0, i).join(" ").toLowerCase();

    if (end1 === start2) {
      const merged = words1.join(" ") + " " + words2.slice(i).join(" ");
      if (merged.length < minLength) {
        bestMerge = merged;
        minLength = merged.length;
      }
    }
  }

  return bestMerge;
}

/**
 * Version améliorée de smartTextSplit avec déduplication
 */
function improvedSmartTextSplit(combinedText, maxWordsPerSegment = 8) {
  // D'abord séparer par phrases
  const sentences = combinedText.split(/[.!?]+/).filter((s) => s.trim());

  // Déduplication au niveau des phrases
  const deduplicatedSentences = deduplicateSubtitles(sentences, 0.5);

  // Maintenant faire le découpage intelligent
  const segments = [];
  let currentSegment = "";
  let wordCount = 0;

  for (const sentence of deduplicatedSentences) {
    const sentenceWords = sentence.trim().split(/\s+/).length;

    if (wordCount + sentenceWords > maxWordsPerSegment && currentSegment) {
      segments.push(currentSegment.trim());
      currentSegment = sentence.trim() + ".";
      wordCount = sentenceWords;
    } else {
      currentSegment += (currentSegment ? " " : "") + sentence.trim() + ".";
      wordCount += sentenceWords;
    }
  }

  if (currentSegment.trim()) {
    segments.push(currentSegment.trim());
  }

  return segments.length > 0 ? segments : [combinedText];
}

/**
 * Fonction principale à intégrer dans votre pipeline
 * Prend une liste de textes et retourne des segments dédupliqués
 */
function processSubtitlesWithDeduplication(allTexts, maxWordsPerSegment = 10) {
  // Filtrer les textes vides
  const validTexts = allTexts.filter((t) => t && t.trim());

  if (validTexts.length === 0) return [];

  // Appliquer la déduplication
  const deduplicatedTexts = deduplicateSubtitles(validTexts, 0.4);

  // Combiner et découper intelligemment
  const combinedText = deduplicatedTexts.join(" ").trim();

  return improvedSmartTextSplit(combinedText, maxWordsPerSegment);
}

module.exports = {
  jaccardSimilarity,
  deduplicateSubtitles,
  removeSequentialDuplicates,
  improvedSmartTextSplit,
  processSubtitlesWithDeduplication,
};
