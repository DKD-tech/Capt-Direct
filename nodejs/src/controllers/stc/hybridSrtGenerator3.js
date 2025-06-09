/**
 * OPTIMISATIONS POUR LE MODE GROUPED - hybridSrtGenerator2.js
 * Améliorations du regroupement intelligent avec contrôle précis
 */

const VideoSegmentModel = require("../../models/VideoSegmentModel");
const SubtitleModel = require("../../models/SubtitleModel");

// Import des modules de déduplication
const {
  basicTextDeduplication,
  detectCrossSegmentDuplicates,
} = require("./deduplication/basicDeduplication");
const {
  intermediateTextDeduplication,
  deduplicateSrtSegments,
} = require("./deduplication/intermediateDeduplication");

/**
 * NOUVELLE CONFIGURATION OPTIMISÉE
 */
const OPTIMIZED_CONFIG = {
  // Paramètres de regroupement améliorés
  grouping: {
    // Tolérance en secondes pour considérer un chevauchement (réduite)
    overlapTolerance: 1.5, // Réduit de 2s à 1.5s pour moins de regroupement

    // Durée maximale d'un groupe en millisecondes
    maxGroupDuration: 8000, // 8 secondes max par groupe

    // Durée minimale pour justifier un groupe
    minGroupDuration: 2000, // 2 secondes min

    // Nombre maximum de segments dans un groupe
    maxSegmentsPerGroup: 3, // Limite à 3 segments max

    // Stratégies de regroupement
    strategy: "balanced", // 'aggressive', 'conservative', 'balanced', 'smart'
  },

  // Paramètres de découpage de texte optimisés
  textSplitting: {
    // Mots par segment (ajustable selon le mode)
    wordsPerSegment: {
      grouped: 8, // Plus court pour les segments groupés
      simple: 6, // Standard pour les segments simples
      smart: 10, // Plus long pour le mode intelligent
    },

    // Durée cible par sous-segment en millisecondes
    targetSubSegmentDuration: 3000, // 3 secondes par sous-segment

    // Durée minimale/maximale par sous-segment
    minSubSegmentDuration: 1500, // 1.5s min
    maxSubSegmentDuration: 6000, // 6s max
  },

  // Configuration de déduplication par mode
  deduplication: {
    level: "intermediate",
    windowSize: 5,
    threshold: 0.7,
    enableCrossSegment: true,
    contextualThreshold: 0.6,
  },
};

/**
 * NOUVEAU: Analyse la qualité d'un regroupement potentiel
 */
function analyzeGroupQuality(group) {
  const starts = group.map((s) => timeToSeconds(s.start_time));
  const ends = group.map((s) => timeToSeconds(s.end_time));

  const groupStart = Math.min(...starts);
  const groupEnd = Math.max(...ends);
  const duration = (groupEnd - groupStart) * 1000; // en ms

  // Calculer les gaps entre segments
  const sortedSegments = group.sort(
    (a, b) => timeToSeconds(a.start_time) - timeToSeconds(b.start_time)
  );
  let totalGaps = 0;

  for (let i = 1; i < sortedSegments.length; i++) {
    const prevEnd = timeToSeconds(sortedSegments[i - 1].end_time);
    const currStart = timeToSeconds(sortedSegments[i].start_time);
    const gap = Math.max(0, currStart - prevEnd);
    totalGaps += gap;
  }

  return {
    duration,
    segmentCount: group.length,
    totalGaps,
    averageGap: totalGaps / Math.max(1, group.length - 1),
    quality:
      duration <= OPTIMIZED_CONFIG.grouping.maxGroupDuration &&
      group.length <= OPTIMIZED_CONFIG.grouping.maxSegmentsPerGroup
        ? "good"
        : "poor",
  };
}

/**
 * NOUVEAU: Stratégies de regroupement intelligentes
 */
function createGroupsWithStrategy(segments, strategy = "balanced") {
  const groups = [];

  switch (strategy) {
    case "conservative":
      return createConservativeGroups(segments);

    case "aggressive":
      return createAggressiveGroups(segments);

    case "smart":
      return createSmartGroups(segments);

    case "balanced":
    default:
      return createBalancedGroups(segments);
  }
}

function createBalancedGroups(segments) {
  const groups = [];
  let currentGroup = [segments[0]];

  for (let i = 1; i < segments.length; i++) {
    const current = segments[i];
    const testGroup = [...currentGroup, current];
    const quality = analyzeGroupQuality(testGroup);

    // Critères équilibrés pour le regroupement
    const shouldGroup =
      quality.quality === "good" &&
      quality.duration <= OPTIMIZED_CONFIG.grouping.maxGroupDuration &&
      quality.averageGap <= OPTIMIZED_CONFIG.grouping.overlapTolerance;

    if (shouldGroup) {
      currentGroup.push(current);
    } else {
      groups.push(currentGroup);
      currentGroup = [current];
    }
  }

  groups.push(currentGroup);
  return groups;
}

function createConservativeGroups(segments) {
  // Regroupement très limité - privilégie des segments courts
  const groups = [];
  let currentGroup = [segments[0]];

  for (let i = 1; i < segments.length; i++) {
    const lastInGroup = currentGroup[currentGroup.length - 1];
    const current = segments[i];

    const lastEnd = timeToSeconds(lastInGroup.end_time);
    const currentStart = timeToSeconds(current.start_time);
    const gap = currentStart - lastEnd;

    // Critères très stricts
    if (gap <= 1.0 && currentGroup.length < 2) {
      currentGroup.push(current);
    } else {
      groups.push(currentGroup);
      currentGroup = [current];
    }
  }

  groups.push(currentGroup);
  return groups;
}

function createSmartGroups(segments) {
  // Regroupement basé sur l'analyse du contenu et du timing
  const groups = [];
  let currentGroup = [segments[0]];

  for (let i = 1; i < segments.length; i++) {
    const current = segments[i];
    const testGroup = [...currentGroup, current];
    const quality = analyzeGroupQuality(testGroup);

    // Analyse plus poussée
    const contextualScore = calculateContextualScore(currentGroup, current);

    if (quality.quality === "good" && contextualScore > 0.5) {
      currentGroup.push(current);
    } else {
      groups.push(currentGroup);
      currentGroup = [current];
    }
  }

  groups.push(currentGroup);
  return groups;
}

async function calculateContextualScore(group, newSegment) {
  // Placeholder pour analyse contextuelle avancée
  // Pourrait analyser la similarité du contenu des sous-titres
  return 0.7; // Score par défaut
}

/**
 * AMÉLIORÉ: Découpage de texte avec contrôle de longueur
 */
function smartTextSplitOptimized(
  text,
  mode = "grouped",
  targetDuration = null
) {
  const config = OPTIMIZED_CONFIG.textSplitting;
  const maxWords =
    config.wordsPerSegment[mode] || config.wordsPerSegment.simple;

  // Appliquer la déduplication d'abord
  const cleanedText = applyDeduplication(text);

  // Si le texte est très court, le retourner tel quel
  const wordCount = cleanedText.split(/\s+/).length;
  if (wordCount <= maxWords) {
    return [cleanedText];
  }

  // Découpage intelligent par phrases
  const sentences = cleanedText.split(/[.!?]+/).filter((s) => s.trim());
  const segments = [];

  let currentSegment = "";
  let currentWordCount = 0;

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    const sentenceWords = trimmedSentence.split(/\s+/).length;

    // Vérifier si on peut ajouter cette phrase
    if (currentWordCount + sentenceWords <= maxWords || !currentSegment) {
      currentSegment += (currentSegment ? " " : "") + trimmedSentence + ".";
      currentWordCount += sentenceWords;
    } else {
      // Finaliser le segment actuel
      segments.push(currentSegment.trim());
      currentSegment = trimmedSentence + ".";
      currentWordCount = sentenceWords;
    }
  }

  if (currentSegment.trim()) {
    segments.push(currentSegment.trim());
  }

  // Si on a encore des segments trop longs, forcer le découpage
  const finalSegments = [];
  for (const segment of segments) {
    const words = segment.split(/\s+/);
    if (words.length > maxWords) {
      // Découpage forcé par chunks
      for (let i = 0; i < words.length; i += maxWords) {
        finalSegments.push(words.slice(i, i + maxWords).join(" "));
      }
    } else {
      finalSegments.push(segment);
    }
  }

  return finalSegments.length > 0 ? finalSegments : [cleanedText];
}

/**
 * OPTIMISÉ: Version groupée avec meilleur contrôle
 */
async function generateGroupedSrtWithOptimizedDeduplication(
  session_id,
  options = {}
) {
  console.log(
    `[Optimized Grouped SRT] Génération optimisée pour session ${session_id}...`
  );

  // Merger les options avec la config optimisée
  const config = {
    ...OPTIMIZED_CONFIG.deduplication,
    ...options,
    grouping: { ...OPTIMIZED_CONFIG.grouping, ...options.grouping },
  };

  let segments = await VideoSegmentModel.findManyBy({ session_id });

  segments = segments
    .filter((s) => s.start_time && s.end_time)
    .sort((a, b) => timeToSeconds(a.start_time) - timeToSeconds(b.start_time));

  if (!segments.length) {
    throw new Error("Aucun segment trouvé");
  }

  // NOUVEAU: Utiliser la stratégie de regroupement optimisée
  const strategy = config.grouping?.strategy || "balanced";
  const groups = createGroupsWithStrategy(segments, strategy);

  console.log(
    `[Optimized Grouped] ${groups.length} groupes créés avec stratégie '${strategy}'`
  );

  // Statistiques de qualité des groupes
  const groupStats = groups.map(analyzeGroupQuality);
  const avgDuration =
    groupStats.reduce((sum, stat) => sum + stat.duration, 0) / groups.length;
  const goodQualityGroups = groupStats.filter(
    (stat) => stat.quality === "good"
  ).length;

  console.log(
    `[Optimized Grouped] Qualité: ${goodQualityGroups}/${groups.length} groupes optimaux`
  );
  console.log(
    `[Optimized Grouped] Durée moyenne: ${(avgDuration / 1000).toFixed(1)}s`
  );

  const srtEntries = [];

  for (const [groupIndex, group] of groups.entries()) {
    // Calculer les bornes du groupe
    const groupStart = Math.min(
      ...group.map((s) => timeToSeconds(s.start_time))
    );
    const groupEnd = Math.max(...group.map((s) => timeToSeconds(s.end_time)));

    // Récupérer tous les sous-titres du groupe
    const allTexts = [];
    for (const segment of group) {
      const subtitles = await SubtitleModel.getSubtitlesBySegment(
        segment.segment_id
      );
      allTexts.push(...subtitles.map((s) => s.text).filter(Boolean));
    }

    if (allTexts.length === 0) continue;

    // Combiner et nettoyer les textes
    const combinedText = allTexts.join(" ").trim();

    if (!combinedText) continue;

    // AMÉLIORÉ: Découpage optimisé selon la durée du groupe
    const groupDuration = (groupEnd - groupStart) * 1000; // en ms
    const textSegments = smartTextSplitOptimized(
      combinedText,
      "grouped",
      groupDuration
    );

    // NOUVEAU: Distribution temporelle intelligente
    const timeDistribution = calculateOptimalTimeDistribution(
      textSegments,
      groupStart,
      groupEnd,
      config.textSplitting
    );

    textSegments.forEach((textPart, index) => {
      const timing = timeDistribution[index] || {
        start: groupStart,
        end: groupEnd,
      };

      srtEntries.push({
        startTime: parseFloat(timing.start.toFixed(3)),
        endTime: parseFloat(timing.end.toFixed(3)),
        text: textPart,
        groupIndex, // Pour le debugging
      });
    });
  }

  console.log(
    `[Optimized Grouped] ${srtEntries.length} entrées avant déduplication cross-segment`
  );

  // Déduplication cross-segment
  let finalEntries = srtEntries;

  if (config.level === "intermediate") {
    finalEntries = deduplicateSrtSegments(srtEntries, config);
  } else if (config.level === "basic" && config.enableCrossSegment) {
    finalEntries = detectCrossSegmentDuplicates(srtEntries);
  }

  console.log(
    `[Optimized Grouped] ${finalEntries.length} entrées après déduplication cross-segment`
  );

  // Résoudre les conflits de timing
  const resolvedEntries = resolveTimingConflicts(finalEntries);

  const srtContent = resolvedEntries
    .map((entry, index) => {
      return `${index + 1}\n${formatSrtTime(
        entry.startTime
      )} --> ${formatSrtTime(entry.endTime)}\n${entry.text}\n`;
    })
    .join("\n");

  // Statistiques finales détaillées
  const finalStats = {
    groups: groups.length,
    groupQuality: {
      good: goodQualityGroups,
      total: groups.length,
      percentage: ((goodQualityGroups / groups.length) * 100).toFixed(1),
    },
    averageGroupDuration: Math.round(avgDuration),
    originalEntries: srtEntries.length,
    deduplicatedEntries: finalEntries.length,
    finalEntries: resolvedEntries.length,
    deduplicationLevel: config.level,
    strategy: strategy,
    // Nouvelles métriques
    averageWordsPerSegment: Math.round(
      resolvedEntries.reduce(
        (sum, entry) => sum + entry.text.split(/\s+/).length,
        0
      ) / resolvedEntries.length
    ),
    averageSegmentDuration: Math.round(
      (resolvedEntries.reduce(
        (sum, entry) => sum + (entry.endTime - entry.startTime),
        0
      ) /
        resolvedEntries.length) *
        1000
    ),
  };

  console.log(
    `[Optimized Grouped SRT] ✅ ${resolvedEntries.length} entrées générées avec optimisations`
  );
  console.log(
    `[Stats] Qualité groupes: ${finalStats.groupQuality.percentage}%`
  );
  console.log(
    `[Stats] Mots/segment: ${finalStats.averageWordsPerSegment}, Durée/segment: ${finalStats.averageSegmentDuration}ms`
  );

  return {
    srtContent,
    stats: finalStats,
  };
}

/**
 * NOUVEAU: Calcul de distribution temporelle optimale
 */
function calculateOptimalTimeDistribution(
  textSegments,
  groupStart,
  groupEnd,
  splittingConfig
) {
  const groupDuration = groupEnd - groupStart;
  const segmentCount = textSegments.length;

  // Calculer les poids relatifs basés sur la longueur des textes
  const weights = textSegments.map((text) => text.split(/\s+/).length);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const distribution = [];
  let currentStart = groupStart;

  for (let i = 0; i < segmentCount; i++) {
    const weight = weights[i];
    const proportion = weight / totalWeight;

    // Durée proportionnelle avec limites min/max
    let duration = groupDuration * proportion;
    duration = Math.max(duration, splittingConfig.minSubSegmentDuration / 1000);
    duration = Math.min(duration, splittingConfig.maxSubSegmentDuration / 1000);

    const end = Math.min(currentStart + duration, groupEnd);

    distribution.push({
      start: currentStart,
      end: end,
    });

    currentStart = end;
  }

  return distribution;
}

// Exporter les fonctions existantes avec les nouvelles optimisations
function timeToSeconds(timeStr) {
  if (typeof timeStr === "number") return timeStr;
  const [h, m, s] = timeStr.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

function formatSrtTime(seconds) {
  const date = new Date(seconds * 1000);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  const ms = String(date.getUTCMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss},${ms}`;
}

function applyDeduplication(
  text,
  level = OPTIMIZED_CONFIG.deduplication.level
) {
  switch (level) {
    case "basic":
      return basicTextDeduplication(text);
    case "intermediate":
      return intermediateTextDeduplication(
        text,
        OPTIMIZED_CONFIG.deduplication
      );
    case "off":
    default:
      return text;
  }
}

function resolveTimingConflicts(srtEntries) {
  const sortedEntries = [...srtEntries].sort(
    (a, b) => a.startTime - b.startTime
  );
  const minGap = 0.1;

  for (let i = 1; i < sortedEntries.length; i++) {
    const current = sortedEntries[i];
    const previous = sortedEntries[i - 1];

    if (current.startTime < previous.endTime) {
      current.startTime = previous.endTime + minGap;

      const minDuration = 1.0;
      if (current.endTime - current.startTime < minDuration) {
        current.endTime = current.startTime + minDuration;
      }
    }
  }

  return sortedEntries;
}

// Conserver les fonctions existantes pour compatibilité
async function generateImprovedSrtWithDeduplication(session_id, options = {}) {
  // Implementation existante inchangée
  console.log(
    `[Improved SRT + Dedup] Génération pour session ${session_id}...`
  );

  const config = { ...OPTIMIZED_CONFIG.deduplication, ...options };

  let segments = await VideoSegmentModel.findManyBy({ session_id });

  segments = segments
    .filter((s) => s.start_time && s.end_time)
    .sort((a, b) => timeToSeconds(a.start_time) - timeToSeconds(b.start_time));

  if (!segments.length) {
    throw new Error("Aucun segment trouvé pour cette session");
  }

  console.log(`[Improved SRT + Dedup] ${segments.length} segments récupérés`);

  const srtEntries = [];

  for (const segment of segments) {
    const subtitles = await SubtitleModel.getSubtitlesBySegment(
      segment.segment_id
    );

    if (subtitles.length === 0) continue;

    const fullText = subtitles
      .map((s) => s.text)
      .join(" ")
      .trim();

    if (!fullText) continue;

    const textSegments = smartTextSplitOptimized(fullText, "simple");

    const segmentStart = timeToSeconds(segment.start_time);
    const segmentEnd = timeToSeconds(segment.end_time);
    const segmentDuration = segmentEnd - segmentStart;

    textSegments.forEach((textPart, index) => {
      const subSegmentDuration = segmentDuration / textSegments.length;
      const startTime = segmentStart + index * subSegmentDuration;
      const endTime = startTime + subSegmentDuration;

      srtEntries.push({
        startTime: parseFloat(startTime.toFixed(3)),
        endTime: parseFloat(endTime.toFixed(3)),
        text: textPart,
      });
    });
  }

  let finalEntries = srtEntries;

  if (config.level === "intermediate") {
    finalEntries = deduplicateSrtSegments(srtEntries, config);
  } else if (config.level === "basic" && config.enableCrossSegment) {
    finalEntries = detectCrossSegmentDuplicates(srtEntries);
  }

  const resolvedEntries = resolveTimingConflicts(finalEntries);

  const srtContent = resolvedEntries
    .map((entry, index) => {
      return `${index + 1}\n${formatSrtTime(
        entry.startTime
      )} --> ${formatSrtTime(entry.endTime)}\n${entry.text}\n`;
    })
    .join("\n");

  return {
    srtContent,
    stats: {
      originalEntries: srtEntries.length,
      deduplicatedEntries: finalEntries.length,
      finalEntries: resolvedEntries.length,
      deduplicationLevel: config.level,
    },
  };
}

// Version héritée pour compatibilité (renommée)
async function generateGroupedSrtWithDeduplication(session_id, options = {}) {
  // Rediriger vers la version optimisée par défaut
  return generateGroupedSrtWithOptimizedDeduplication(session_id, options);
}

module.exports = {
  // Nouvelles fonctions optimisées
  generateGroupedSrtWithOptimizedDeduplication,
  smartTextSplitOptimized,
  createGroupsWithStrategy,
  analyzeGroupQuality,
  OPTIMIZED_CONFIG,

  // Fonctions existantes
  generateImprovedSrtWithDeduplication,
  generateGroupedSrtWithDeduplication, // Pointe vers la version optimisée
  applyDeduplication,
  formatSrtTime,
  resolveTimingConflicts,
  timeToSeconds,
};
