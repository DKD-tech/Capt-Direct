const fs = require("fs");
const path = require("path");

// Import des fonctions optimisées
const {
  generateImprovedSrtWithDeduplication,
  generateGroupedSrtWithOptimizedDeduplication,
  generateGroupedSrtWithDeduplication, // Fallback vers version optimisée
  OPTIMIZED_CONFIG,
} = require("../stc/hybridSrtGenerator3");

// Import des fonctions legacy pour compatibilité
const {
  generateImprovedSrt,
  generateGroupedSrt,
} = require("../stc/hybridSrtGenerator");

/**
 * NOUVEAU: Controller optimisé avec stratégies de regroupement
 */
async function exportSrtOptimizedController(req, res) {
  const { session_id } = req.params;
  const {
    strategy = "balanced",
    level = "intermediate",
    mode = "grouped",
    // Nouveaux paramètres de contrôle
    maxGroupDuration = 8000,
    maxSegmentsPerGroup = 3,
    overlapTolerance = 1.5,
    targetWordsPerSegment = 8,
    // Paramètres de déduplication
    threshold = 0.7,
    windowSize = 5,
    enableCrossSegment = "true",
  } = req.query;

  try {
    console.log(
      `[SRT Optimized] ➤ Mode: ${mode} - Stratégie: ${strategy} - Session: ${session_id}`
    );

    // Configuration optimisée
    const options = {
      level,
      windowSize: parseInt(windowSize),
      threshold: parseFloat(threshold),
      enableCrossSegment: enableCrossSegment === "true",

      // Nouvelles options de regroupement
      grouping: {
        strategy,
        maxGroupDuration: parseInt(maxGroupDuration),
        maxSegmentsPerGroup: parseInt(maxSegmentsPerGroup),
        overlapTolerance: parseFloat(overlapTolerance),
      },

      // Options de découpage de texte
      textSplitting: {
        wordsPerSegment: {
          grouped: parseInt(targetWordsPerSegment),
          simple: Math.max(6, parseInt(targetWordsPerSegment) - 2),
          smart: parseInt(targetWordsPerSegment) + 2,
        },
      },
    };

    let result;
    let srtContent;

    switch (mode) {
      case "grouped-optimized":
      case "grouped":
        result = await generateGroupedSrtWithOptimizedDeduplication(
          session_id,
          options
        );
        srtContent = result.srtContent;
        break;

      case "improved":
      default:
        result = await generateImprovedSrtWithDeduplication(
          session_id,
          options
        );
        srtContent = result.srtContent;
        break;
    }

    if (!srtContent || srtContent.trim().length < 10) {
      return res.status(204).json({
        message: "Aucun contenu SRT généré pour cette session.",
        mode,
        strategy,
        level,
      });
    }

    // Statistiques détaillées
    const lines = srtContent.split("\n").filter((line) => line.trim());
    const subtitleCount = Math.floor(lines.length / 4);

    console.log(`[SRT Optimized] ✅ ${subtitleCount} sous-titres générés`);
    console.log(`[SRT Optimized] 📊 Statistiques détaillées :`);

    if (result.stats) {
      Object.entries(result.stats).forEach(([key, value]) => {
        if (typeof value === "object" && value !== null) {
          console.log(`- ${key}: ${JSON.stringify(value)}`);
        } else {
          console.log(`- ${key}: ${value}`);
        }
      });
    }

    // Nom de fichier descriptif
    const filename = `session_${session_id}_${mode}_${strategy}_${level}.srt`;
    const filePath = path.join(__dirname, `../../../srt_exports/${filename}`);

    // Créer le dossier si nécessaire
    const exportDir = path.dirname(filePath);
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    fs.writeFileSync(filePath, srtContent, "utf8");

    res.setHeader("Content-Type", "application/x-subrip; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    return res.status(200).send(srtContent);
  } catch (err) {
    console.error(`❌ Erreur génération SRT optimisé (${strategy}) :`, err);
    return res.status(500).json({
      message: `Erreur génération SRT optimisé en stratégie ${strategy}`,
      error:
        process.env.NODE_ENV === "development" ? err.message : "Erreur interne",
    });
  }
}

/**
 * AMÉLIORÉ: Controller flexible avec nouvelles options
 */
async function exportSrtFlexible2Controller(req, res) {
  const { session_id } = req.params;
  const {
    mode = "improved",
    level = "intermediate",
    threshold = 0.7,
    windowSize = 5,
    enableCrossSegment = "true",

    // Nouveaux paramètres pour le mode grouped
    strategy = "balanced",
    maxGroupDuration = 8000,
    maxSegmentsPerGroup = 3,
    overlapTolerance = 1.5,
    targetWordsPerSegment = 8,
  } = req.query;

  try {
    console.log(
      `[SRT Flexible] ➤ Mode: ${mode} - Session: ${session_id} - Level: ${level}`
    );

    let result;
    let srtContent;

    const options = {
      level,
      windowSize: parseInt(windowSize),
      threshold: parseFloat(threshold),
      enableCrossSegment: enableCrossSegment === "true",

      // Configuration de regroupement si applicable
      grouping: {
        strategy,
        maxGroupDuration: parseInt(maxGroupDuration),
        maxSegmentsPerGroup: parseInt(maxSegmentsPerGroup),
        overlapTolerance: parseFloat(overlapTolerance),
      },

      textSplitting: {
        wordsPerSegment: {
          grouped: parseInt(targetWordsPerSegment),
          simple: Math.max(6, parseInt(targetWordsPerSegment) - 2),
        },
      },
    };

    // Suite du controller exportSrtFlexibleController
    switch (mode) {
      case "grouped-optimized":
        result = await generateGroupedSrtWithOptimizedDeduplication(
          session_id,
          options
        );
        srtContent = result.srtContent;
        break;

      case "grouped":
        result = await generateGroupedSrtWithDeduplication(session_id, options);
        srtContent = result.srtContent;
        break;

      case "grouped-legacy":
        // Utiliser l'ancienne version sans déduplication
        result = await generateGroupedSrt(session_id);
        srtContent = result.srtContent;
        break;

      case "improved":
        result = await generateImprovedSrtWithDeduplication(
          session_id,
          options
        );
        srtContent = result.srtContent;
        break;

      case "simple":
      case "legacy":
        // Utiliser l'ancienne version simple
        result = await generateImprovedSrt(session_id);
        srtContent = result.srtContent;
        break;

      default:
        return res.status(400).json({
          message: `Mode "${mode}" non reconnu`,
          availableModes: [
            "grouped-optimized",
            "grouped",
            "grouped-legacy",
            "improved",
            "simple",
            "legacy",
          ],
        });
    }

    if (!srtContent || srtContent.trim().length < 10) {
      return res.status(204).json({
        message: "Aucun contenu SRT généré pour cette session.",
        mode,
        level,
        session_id,
      });
    }

    // Statistiques détaillées
    const lines = srtContent.split("\n").filter((line) => line.trim());
    const subtitleCount = Math.floor(lines.length / 4);

    console.log(`[SRT Flexible] ✅ ${subtitleCount} sous-titres générés`);

    if (result.stats) {
      console.log(`[SRT Flexible] 📊 Statistiques:`);
      Object.entries(result.stats).forEach(([key, value]) => {
        if (typeof value === "object" && value !== null) {
          console.log(`  - ${key}: ${JSON.stringify(value)}`);
        } else {
          console.log(`  - ${key}: ${value}`);
        }
      });
    }

    // Nom de fichier avec timestamp pour éviter les conflits
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const filename = `session_${session_id}_${mode}_${level}_${timestamp}.srt`;
    const filePath = path.join(__dirname, `../../../srt_exports/${filename}`);

    // Créer le dossier si nécessaire
    const exportDir = path.dirname(filePath);
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Sauvegarder le fichier
    fs.writeFileSync(filePath, srtContent, "utf8");

    // Headers pour le téléchargement
    res.setHeader("Content-Type", "application/x-subrip; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", Buffer.byteLength(srtContent, "utf8"));

    console.log(`[SRT Flexible] 💾 Fichier sauvegardé: ${filename}`);

    return res.status(200).send(srtContent);
  } catch (err) {
    console.error(`❌ Erreur génération SRT flexible (${mode}) :`, err);
    return res.status(500).json({
      message: `Erreur génération SRT en mode ${mode}`,
      mode,
      level,
      session_id,
      error:
        process.env.NODE_ENV === "development" ? err.message : "Erreur interne",
    });
  }
}

/**
 * NOUVEAU: Controller de diagnostic pour tester les configurations
 */
async function diagnosticSrtController(req, res) {
  const { session_id } = req.params;

  try {
    console.log(`[SRT Diagnostic] ➤ Analyse session: ${session_id}`);

    // Tester différentes configurations
    const configurations = [
      { mode: "improved", level: "basic", label: "Simple basique" },
      {
        mode: "improved",
        level: "intermediate",
        label: "Simple intermédiaire",
      },
      {
        mode: "grouped",
        level: "intermediate",
        strategy: "conservative",
        label: "Groupé conservateur",
      },
      {
        mode: "grouped",
        level: "intermediate",
        strategy: "balanced",
        label: "Groupé équilibré",
      },
      {
        mode: "grouped",
        level: "intermediate",
        strategy: "aggressive",
        label: "Groupé agressif",
      },
    ];

    const results = [];

    for (const config of configurations) {
      try {
        const options = {
          level: config.level,
          windowSize: 5,
          threshold: 0.7,
          enableCrossSegment: true,
          grouping: {
            strategy: config.strategy || "balanced",
            maxGroupDuration: 8000,
            maxSegmentsPerGroup: 3,
            overlapTolerance: 1.5,
          },
        };

        let result;
        switch (config.mode) {
          case "grouped":
            result = await generateGroupedSrtWithOptimizedDeduplication(
              session_id,
              options
            );
            break;
          case "improved":
          default:
            result = await generateImprovedSrtWithDeduplication(
              session_id,
              options
            );
            break;
        }

        if (result && result.srtContent) {
          const lines = result.srtContent
            .split("\n")
            .filter((line) => line.trim());
          const subtitleCount = Math.floor(lines.length / 4);

          results.push({
            ...config,
            success: true,
            subtitleCount,
            stats: result.stats,
            contentLength: result.srtContent.length,
          });
        } else {
          results.push({
            ...config,
            success: false,
            error: "Aucun contenu généré",
          });
        }
      } catch (err) {
        results.push({
          ...config,
          success: false,
          error: err.message,
        });
      }
    }

    console.log(`[SRT Diagnostic] ✅ ${results.length} configurations testées`);

    return res.status(200).json({
      session_id,
      timestamp: new Date().toISOString(),
      configurations: results,
      summary: {
        total: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
      recommendation: getBestConfiguration(results),
    });
  } catch (err) {
    console.error(`❌ Erreur diagnostic SRT :`, err);
    return res.status(500).json({
      message: "Erreur lors du diagnostic SRT",
      session_id,
      error:
        process.env.NODE_ENV === "development" ? err.message : "Erreur interne",
    });
  }
}

/**
 * Fonction utilitaire pour recommander la meilleure configuration
 */
function getBestConfiguration(results) {
  const successful = results.filter((r) => r.success);

  if (successful.length === 0) {
    return { message: "Aucune configuration n'a fonctionné" };
  }

  // Trouver la configuration avec le meilleur équilibre
  const scored = successful.map((config) => {
    let score = 0;

    // Points pour le nombre de sous-titres (ni trop peu, ni trop)
    if (config.subtitleCount >= 10 && config.subtitleCount <= 100) {
      score += 3;
    } else if (config.subtitleCount > 5) {
      score += 1;
    }

    // Points pour la qualité des groupes si disponible
    if (config.stats?.groupQuality?.percentage) {
      const quality = parseFloat(config.stats.groupQuality.percentage);
      if (quality >= 80) score += 3;
      else if (quality >= 60) score += 2;
      else if (quality >= 40) score += 1;
    }

    // Points pour la réduction de doublons
    if (config.stats?.deduplicatedEntries && config.stats?.originalEntries) {
      const reduction =
        (config.stats.originalEntries - config.stats.deduplicatedEntries) /
        config.stats.originalEntries;
      if (reduction > 0.1) score += 2; // Bonus si réduction significative
    }

    return { ...config, score };
  });

  const best = scored.reduce((a, b) => (a.score > b.score ? a : b));

  return {
    recommended: {
      mode: best.mode,
      level: best.level,
      strategy: best.strategy,
      label: best.label,
    },
    score: best.score,
    reason: `Meilleur équilibre avec ${best.subtitleCount} sous-titres`,
    stats: best.stats,
  };
}

/**
 * NOUVEAU: Controller pour obtenir la configuration optimale
 */
async function getOptimalConfigController(req, res) {
  try {
    const config = OPTIMIZED_CONFIG;

    return res.status(200).json({
      message: "Configuration optimale actuelle",
      config,
      usage: {
        grouped: "Pour des sous-titres regroupés par scènes",
        improved: "Pour des sous-titres segmentés précisément",
        strategies: {
          conservative: "Regroupement minimal, segments courts",
          balanced: "Équilibre entre regroupement et précision",
          aggressive: "Regroupement maximal, segments longs",
          smart: "Regroupement basé sur l'analyse contextuelle",
        },
        levels: {
          off: "Aucune déduplication",
          basic: "Déduplication simple",
          intermediate: "Déduplication avancée avec analyse contextuelle",
        },
      },
      examples: {
        conservative: "?mode=grouped&strategy=conservative&level=intermediate",
        balanced: "?mode=grouped&strategy=balanced&level=intermediate",
        aggressive: "?mode=grouped&strategy=aggressive&level=intermediate",
        simple: "?mode=improved&level=intermediate",
      },
    });
  } catch (err) {
    console.error("❌ Erreur récupération config optimale :", err);
    return res.status(500).json({
      message: "Erreur récupération configuration",
      error:
        process.env.NODE_ENV === "development" ? err.message : "Erreur interne",
    });
  }
}

module.exports = {
  exportSrtOptimizedController,
  exportSrtFlexible2Controller,
  diagnosticSrtController,
  getOptimalConfigController,
};
