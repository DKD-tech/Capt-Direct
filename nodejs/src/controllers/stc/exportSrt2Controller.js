const fs = require("fs");
const path = require("path");

// Import de votre solution hybride
// const {
//   generateImprovedSrt,
//   generateGroupedSrt,
// } = require("../stc/hybridSrtGenerator2");

const {
  generateGroupedSrtWithDeduplication,
  generateImprovedSrtWithDeduplication,
  generateCorrectedSrtWithDeduplication,
  generateGroupedSrtWithQualityConstraints,
  correctTextWithLanguageTool,
  correctTextsBatch,
  smartTextSplitWithCorrectionAndDeduplication,
  LANGUAGETOOL_CONFIG,
} = require("../stc/hybridSrtGenerator2");

const {
  generateImprovedSrt,
  generateGroupedSrt,
} = require("../stc/hybridSrtGenerator");

// async function exportSrtImprovedController(req, res) {
//   const { session_id } = req.params;

//   try {
//     console.log(
//       `[SRT Export Improved] ➤ Lancement de la génération pour la session ${session_id}...`
//     );

//     // Choix de la méthode de génération
//     // Option 1: Génération simple (recommandée par défaut)
//     const srtContent = await generateImprovedSrt(session_id);

//     // Option 2: Génération avec groupement (si vous préférez)
//     // const srtContent = await generateGroupedSrt(session_id);

//     if (!srtContent || srtContent.trim().length < 10) {
//       console.warn(
//         "[SRT Export Improved] ⚠️ Aucune donnée SRT générée ou contenu vide."
//       );
//       return res.status(204).json({
//         message: "Aucun contenu SRT généré pour cette session.",
//       });
//     }

//     // Affichage aperçu dans la console (limité pour la lisibilité)
//     const preview = srtContent.substring(0, 800);
//     console.log(
//       `[SRT Export Improved] ✅ Contenu généré (${
//         srtContent.length
//       } caractères) :\n${preview}${srtContent.length > 800 ? "\n..." : ""}`
//     );

//     // Création du dossier si nécessaire
//     const exportDir = path.join(__dirname, "../../../srt_exports");
//     if (!fs.existsSync(exportDir)) {
//       fs.mkdirSync(exportDir, { recursive: true });
//       console.log(`[SRT Export Improved] 📁 Dossier créé : ${exportDir}`);
//     }

//     // Enregistrement fichier sur disque
//     const filePath = path.join(exportDir, `session_${session_id}_improved.srt`);
//     fs.writeFileSync(filePath, srtContent, "utf8");
//     console.log(`[SRT Export Improved] 💾 Sauvegardé à : ${filePath}`);

//     // Envoi au client avec les bons headers
//     res.setHeader("Content-Type", "application/x-subrip; charset=utf-8");
//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename="session_${session_id}_improved.srt"`
//     );

//     return res.status(200).send(srtContent);
//   } catch (err) {
//     console.error("❌ Erreur génération SRT amélioré :", err);

//     // Log plus détaillé en cas d'erreur
//     if (err.stack) {
//       console.error("Stack trace :", err.stack);
//     }

//     return res.status(500).json({
//       message: "Erreur lors de la génération du SRT amélioré",
//       error:
//         process.env.NODE_ENV === "development" ? err.message : "Erreur interne",
//     });
//   }
// }

/**
 * Version alternative avec choix du mode de génération via query param
 * Exemple: /export-srt/123?mode=grouped
 */
// async function exportSrtFlexibleController(req, res) {
//   const { session_id } = req.params;
//   const { mode = "simple" } = req.query;

//   try {
//     console.log(
//       `[SRT Export Flexible] ➤ Mode: ${mode} - Session: ${session_id}`
//     );

//     let srtContent;

//     switch (mode) {
//       case "grouped":
//         srtContent = await generateGroupedSrt(session_id);
//         break;
//       case "simple":
//       default:
//         srtContent = await generateImprovedSrt(session_id);
//         break;
//     }

//     if (!srtContent || srtContent.trim().length < 10) {
//       return res.status(204).json({
//         message: "Aucun contenu SRT généré pour cette session.",
//         mode: mode,
//       });
//     }

//     // Stats du contenu généré
//     const lines = srtContent.split("\n").filter((line) => line.trim());
//     const subtitleCount = Math.floor(lines.length / 4); // Approximation

//     console.log(
//       `[SRT Export Flexible] ✅ ${subtitleCount} sous-titres générés en mode ${mode}`
//     );

//     const filePath = path.join(
//       __dirname,
//       `../../../srt_exports/session_${session_id}_${mode}.srt`
//     );

//     fs.writeFileSync(filePath, srtContent, "utf8");

//     res.setHeader("Content-Type", "application/x-subrip; charset=utf-8");
//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename="session_${session_id}_${mode}.srt"`
//     );

//     return res.status(200).send(srtContent);
//   } catch (err) {
//     console.error(`❌ Erreur génération SRT (mode ${mode}) :`, err);
//     return res.status(500).json({
//       message: `Erreur génération SRT en mode ${mode}`,
//       error:
//         process.env.NODE_ENV === "development" ? err.message : "Erreur interne",
//     });
//   }
// }

async function exportSrtImprovedController(req, res) {
  const { session_id } = req.params;
  const { level = "intermediate", windowSize = 5, threshold = 0.7 } = req.query;

  try {
    console.log(
      `[SRT Export Improved] ➤ Lancement de la génération pour la session ${session_id}...`
    );

    // Utilisation de la nouvelle fonction avec déduplication
    const options = {
      level,
      windowSize: parseInt(windowSize),
      threshold: parseFloat(threshold),
    };

    const result = await generateImprovedSrtWithDeduplication(
      session_id,
      options
    );
    const srtContent = result.srtContent;

    if (!srtContent || srtContent.trim().length < 10) {
      console.warn(
        "[SRT Export Improved] ⚠️ Aucune donnée SRT générée ou contenu vide."
      );
      return res.status(204).json({
        message: "Aucun contenu SRT généré pour cette session.",
      });
    }

    // Affichage des statistiques de déduplication
    console.log(`[SRT Export Improved] 📊 Statistiques de déduplication :`);
    console.log(`- Entrées originales: ${result.stats.originalEntries}`);
    console.log(`- Après déduplication: ${result.stats.deduplicatedEntries}`);
    console.log(`- Entrées finales: ${result.stats.finalEntries}`);
    console.log(
      `- Niveau de déduplication: ${result.stats.deduplicationLevel}`
    );

    // Affichage aperçu dans la console (limité pour la lisibilité)
    const preview = srtContent.substring(0, 800);
    console.log(
      `[SRT Export Improved] ✅ Contenu généré (${
        srtContent.length
      } caractères) :\n${preview}${srtContent.length > 800 ? "\n..." : ""}`
    );

    // Création du dossier si nécessaire
    const exportDir = path.join(__dirname, "../../../srt_exports");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
      console.log(`[SRT Export Improved] 📁 Dossier créé : ${exportDir}`);
    }

    // Enregistrement fichier sur disque
    const filePath = path.join(
      exportDir,
      `session_${session_id}_improved_${level}.srt`
    );
    fs.writeFileSync(filePath, srtContent, "utf8");
    console.log(`[SRT Export Improved] 💾 Sauvegardé à : ${filePath}`);

    // Envoi au client avec les bons headers
    res.setHeader("Content-Type", "application/x-subrip; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="session_${session_id}_improved_${level}.srt"`
    );

    return res.status(200).send(srtContent);
  } catch (err) {
    console.error("❌ Erreur génération SRT amélioré :", err);

    // Log plus détaillé en cas d'erreur
    if (err.stack) {
      console.error("Stack trace :", err.stack);
    }

    return res.status(500).json({
      message: "Erreur lors de la génération du SRT amélioré",
      error:
        process.env.NODE_ENV === "development" ? err.message : "Erreur interne",
    });
  }
}

/**
 * Version flexible avec choix du mode de génération et options de déduplication
 * Exemples d'utilisation:
 * - /export-srt/123?mode=simple (sans déduplication)
 * - /export-srt/123?mode=improved&level=basic (déduplication basique)
 * - /export-srt/123?mode=grouped&level=intermediate&threshold=0.8 (groupé avec déduplication avancée)
 */
async function exportSrtFlexibleController(req, res) {
  const { session_id } = req.params;
  const {
    mode = "improved",
    level = "intermediate",
    threshold = 0.7,
    windowSize = 5,
    enableCrossSegment = "true",
  } = req.query;

  try {
    console.log(
      `[SRT Export Flexible] ➤ Mode: ${mode} - Session: ${session_id} - Level: ${level}`
    );

    let result;
    let srtContent;

    const options = {
      level,
      windowSize: parseInt(windowSize),
      threshold: parseFloat(threshold),
      enableCrossSegment: enableCrossSegment === "true",
    };

    switch (mode) {
      case "grouped":
        result = await generateGroupedSrtWithDeduplication(session_id, options);
        srtContent = result.srtContent;
        break;

      case "grouped-legacy":
        // Version sans déduplication pour compatibilité
        srtContent = await generateGroupedSrt(session_id);
        result = { srtContent, stats: { legacy: true } };
        break;

      case "simple-legacy":
        // Version sans déduplication pour compatibilité
        srtContent = await generateImprovedSrt(session_id);
        result = { srtContent, stats: { legacy: true } };
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
        mode: mode,
        level: level,
      });
    }

    // Stats du contenu généré
    const lines = srtContent.split("\n").filter((line) => line.trim());
    const subtitleCount = Math.floor(lines.length / 4); // Approximation

    console.log(
      `[SRT Export Flexible] ✅ ${subtitleCount} sous-titres générés en mode ${mode}`
    );

    // Affichage des statistiques si disponibles
    if (result.stats && !result.stats.legacy) {
      console.log(`[SRT Export Flexible] 📊 Statistiques :`);
      if (result.stats.groups) {
        console.log(`- Groupes créés: ${result.stats.groups}`);
      }
      console.log(`- Entrées originales: ${result.stats.originalEntries}`);
      console.log(`- Après déduplication: ${result.stats.deduplicatedEntries}`);
      console.log(`- Entrées finales: ${result.stats.finalEntries}`);
      console.log(`- Niveau: ${result.stats.deduplicationLevel}`);
    }

    const filePath = path.join(
      __dirname,
      `../../../srt_exports/session_${session_id}_${mode}_${level}.srt`
    );

    fs.writeFileSync(filePath, srtContent, "utf8");

    res.setHeader("Content-Type", "application/x-subrip; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="session_${session_id}_${mode}_${level}.srt"`
    );

    return res.status(200).send(srtContent);
  } catch (err) {
    console.error(`❌ Erreur génération SRT (mode ${mode}) :`, err);
    return res.status(500).json({
      message: `Erreur génération SRT en mode ${mode}`,
      error:
        process.env.NODE_ENV === "development" ? err.message : "Erreur interne",
    });
  }
}

/**
 * Controller spécialisé pour les tests de déduplication
 * Permet de comparer facilement les différents niveaux
 */
async function exportSrtComparisonController(req, res) {
  const { session_id } = req.params;

  try {
    console.log(
      `[SRT Comparison] ➤ Génération comparative pour session ${session_id}`
    );

    const modes = [
      { name: "original", level: "off" },
      { name: "basic", level: "basic" },
      { name: "intermediate", level: "intermediate" },
    ];

    const results = {};

    for (const mode of modes) {
      try {
        const result = await generateImprovedSrtWithDeduplication(session_id, {
          level: mode.level,
        });
        results[mode.name] = {
          content: result.srtContent,
          stats: result.stats,
        };
      } catch (err) {
        console.error(`Erreur pour mode ${mode.name}:`, err.message);
        results[mode.name] = { error: err.message };
      }
    }

    // Créer un fichier de comparaison
    let comparisonContent =
      "=== COMPARAISON DES NIVEAUX DE DÉDUPLICATION ===\n\n";

    for (const [modeName, result] of Object.entries(results)) {
      if (result.error) {
        comparisonContent += `${modeName.toUpperCase()}: ERREUR - ${
          result.error
        }\n\n`;
      } else {
        comparisonContent += `${modeName.toUpperCase()}:\n`;
        comparisonContent += `Stats: ${JSON.stringify(
          result.stats,
          null,
          2
        )}\n`;
        comparisonContent += `Contenu (200 premiers caractères):\n${result.content.substring(
          0,
          200
        )}...\n\n`;
      }
    }

    const filePath = path.join(
      __dirname,
      `../../../srt_exports/session_${session_id}_comparison.txt`
    );

    fs.writeFileSync(filePath, comparisonContent, "utf8");

    return res.status(200).json({
      message: "Comparaison générée avec succès",
      results: Object.fromEntries(
        Object.entries(results).map(([key, value]) => [
          key,
          value.error ? { error: value.error } : { stats: value.stats },
        ])
      ),
      filePath,
    });
  } catch (err) {
    console.error("❌ Erreur génération comparaison :", err);
    return res.status(500).json({
      message: "Erreur lors de la génération de la comparaison",
      error:
        process.env.NODE_ENV === "development" ? err.message : "Erreur interne",
    });
  }
}

/**
 * Controller pour export SRT avec correction LanguageTool ET déduplication
 * Exemple d'utilisation: /export-srt-corrected/123?level=intermediate&language=fr&enableCorrection=true
 */
async function exportSrtCorrectedController(req, res) {
  const { session_id } = req.params;
  const {
    level = "intermediate",
    windowSize = 5,
    threshold = 0.7,
    language = "fr",
    enableCorrection = "true",
    enableCrossSegment = "true",
  } = req.query;

  try {
    console.log(
      `[SRT Export Corrected] ➤ Lancement génération avec correction pour session ${session_id}...`
    );
    console.log(
      `[SRT Export Corrected] Paramètres: level=${level}, language=${language}, correction=${enableCorrection}`
    );

    const options = {
      deduplication: {
        level,
        windowSize: parseInt(windowSize),
        threshold: parseFloat(threshold),
        enableCrossSegment: enableCrossSegment === "true",
      },
      languageTool: {
        enabled: enableCorrection === "true",
        defaultLanguage: language,
      },
    };

    const result = await generateCorrectedSrtWithDeduplication(
      session_id,
      options
    );

    const srtContent = result.srtContent;

    if (!srtContent || srtContent.trim().length < 10) {
      console.warn(
        "[SRT Export Corrected] ⚠️ Aucune donnée SRT générée ou contenu vide."
      );
      return res.status(204).json({
        message: "Aucun contenu SRT généré pour cette session.",
      });
    }

    // Affichage des statistiques complètes
    console.log(`[SRT Export Corrected] 📊 Statistiques détaillées :`);
    console.log(`- Entrées originales: ${result.stats.originalEntries}`);
    console.log(`- Après déduplication: ${result.stats.deduplicatedEntries}`);
    console.log(`- Entrées finales: ${result.stats.finalEntries}`);
    console.log(
      `- Niveau de déduplication: ${result.stats.deduplicationLevel}`
    );
    console.log(`- Langue utilisée: ${result.stats.languageUsed}`);

    if (result.stats.correction) {
      console.log(`- Textes traités: ${result.stats.correction.totalTexts}`);
      console.log(
        `- Textes corrigés: ${result.stats.correction.correctedTexts}`
      );
      console.log(`- Erreurs de correction: ${result.stats.correction.errors}`);
    }

    // Affichage aperçu
    const preview = srtContent.substring(0, 800);
    console.log(
      `[SRT Export Corrected] ✅ Contenu généré (${
        srtContent.length
      } caractères) :\n${preview}${srtContent.length > 800 ? "\n..." : ""}`
    );

    // Création du dossier si nécessaire
    const exportDir = path.join(__dirname, "../../../srt_exports");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
      console.log(`[SRT Export Corrected] 📁 Dossier créé : ${exportDir}`);
    }

    // Nom de fichier avec suffixes appropriés
    const correctionSuffix = options.languageTool.enabled ? "_corrected" : "";
    const filePath = path.join(
      exportDir,
      `session_${session_id}_dedup_${level}${correctionSuffix}_${language}.srt`
    );

    fs.writeFileSync(filePath, srtContent, "utf8");
    console.log(`[SRT Export Corrected] 💾 Sauvegardé à : ${filePath}`);

    // Envoi au client avec les bons headers
    res.setHeader("Content-Type", "application/x-subrip; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="session_${session_id}_dedup_${level}${correctionSuffix}_${language}.srt"`
    );

    return res.status(200).send(srtContent);
  } catch (err) {
    console.error("❌ Erreur génération SRT avec correction :", err);

    if (err.stack) {
      console.error("Stack trace :", err.stack);
    }

    return res.status(500).json({
      message: "Erreur lors de la génération du SRT avec correction",
      error:
        process.env.NODE_ENV === "development" ? err.message : "Erreur interne",
    });
  }
}

/**
 * Controller spécialisé pour export SRT avec contraintes de qualité
 * Utilise generateGroupedSrtWithQualityConstraints qui n'est pas testée ailleurs
 */
// SOLUTION COMPLÈTE : Diagnostic et correction

async function exportSrtQualityController(req, res) {
  const { session_id } = req.params;
  const {
    level = "intermediate",
    windowSize = 5,
    threshold = 0.7,
    enableCrossSegment = "true",
    minDuration = 1.0,
    maxDuration = 7.0,
    maxCPS = 20,
    minGap = 0.1,
    forceGenerate = "false", // Nouveau paramètre pour forcer la génération
  } = req.query;

  try {
    console.log(
      `[SRT Export Quality] ➤ Lancement génération avec contraintes de qualité pour session ${session_id}...`
    );

    // ÉTAPE 1: D'abord, récupérer le contenu SRT sans contraintes de qualité
    console.log(
      `[SRT Export Quality] 🔍 DIAGNOSTIC: Récupération du contenu brut...`
    );

    const baseOptions = {
      level,
      windowSize: parseInt(windowSize),
      threshold: parseFloat(threshold),
      enableCrossSegment: enableCrossSegment === "true",
      qualityConstraints: {
        minDuration: 0,
        maxDuration: 999,
        maxCPS: 999,
        minGap: 0,
      },
    };

    // Récupérer le contenu brut
    const rawResult = await generateGroupedSrtWithQualityConstraints(
      session_id,
      baseOptions
    );

    console.log(`[SRT Export Quality] 📊 DIAGNOSTIC: Contenu brut obtenu`);
    console.log(
      `- Entrées trouvées: ${rawResult.stats?.finalEntries || "inconnu"}`
    );
    console.log(`- Contenu SRT: ${rawResult.srtContent ? "OUI" : "NON"}`);

    if (!rawResult.srtContent || rawResult.srtContent.trim().length < 10) {
      console.error(
        `[SRT Export Quality] ❌ DIAGNOSTIC: Aucun contenu brut disponible`
      );
      return res.status(404).json({
        message: "Aucun contenu SRT disponible pour cette session",
        sessionId: session_id,
        diagnosis: "Pas de données de base disponibles",
      });
    }

    // ÉTAPE 2: Analyser le contenu brut
    const rawMetrics = calculateDetailedSrtMetrics(rawResult.srtContent);
    console.log(
      `[SRT Export Quality] 📈 DIAGNOSTIC: Métriques du contenu brut:`
    );
    console.log(`- Nombre de sous-titres: ${rawMetrics.subtitleCount}`);
    console.log(
      `- CPS min/max/moyen: ${rawMetrics.minCPS.toFixed(
        1
      )}/${rawMetrics.maxCPS.toFixed(1)}/${rawMetrics.avgCPS.toFixed(1)}`
    );
    console.log(
      `- Durée min/max/moy: ${rawMetrics.minDuration.toFixed(
        1
      )}s/${rawMetrics.maxDuration.toFixed(
        1
      )}s/${rawMetrics.avgDuration.toFixed(1)}s`
    );

    // ÉTAPE 3: Décider des contraintes à appliquer
    let finalMaxCPS = parseFloat(maxCPS);
    let finalMaxDuration = parseFloat(maxDuration);
    let finalMinDuration = parseFloat(minDuration);

    if (forceGenerate === "true") {
      // Mode forcé : ajuster les contraintes aux données existantes
      finalMaxCPS = Math.max(finalMaxCPS, rawMetrics.maxCPS * 1.1);
      finalMaxDuration = Math.max(
        finalMaxDuration,
        rawMetrics.maxDuration * 1.1
      );
      finalMinDuration = Math.min(
        finalMinDuration,
        rawMetrics.minDuration * 0.9
      );

      console.log(`[SRT Export Quality] 🔧 MODE FORCÉ: Contraintes ajustées`);
      console.log(`- maxCPS: ${maxCPS} → ${finalMaxCPS.toFixed(1)}`);
      console.log(
        `- maxDuration: ${maxDuration} → ${finalMaxDuration.toFixed(1)}`
      );
      console.log(
        `- minDuration: ${minDuration} → ${finalMinDuration.toFixed(1)}`
      );
    }

    // ÉTAPE 4: Appliquer les contraintes manuellement si nécessaire
    let finalSrtContent = rawResult.srtContent;
    let appliedConstraints = false;

    if (
      rawMetrics.maxCPS > finalMaxCPS ||
      rawMetrics.maxDuration > finalMaxDuration
    ) {
      console.log(
        `[SRT Export Quality] ⚙️ Application manuelle des contraintes...`
      );

      // Appliquer les contraintes manuellement
      finalSrtContent = applyQualityConstraintsManually(rawResult.srtContent, {
        minDuration: finalMinDuration,
        maxDuration: finalMaxDuration,
        maxCPS: finalMaxCPS,
        minGap: parseFloat(minGap),
      });

      appliedConstraints = true;
    } else {
      console.log(
        `[SRT Export Quality] ✅ Contenu brut respecte déjà les contraintes`
      );
    }

    // ÉTAPE 5: Vérifier le résultat final
    if (!finalSrtContent || finalSrtContent.trim().length < 10) {
      console.warn(
        `[SRT Export Quality] ⚠️ Contenu final vide, utilisation du contenu brut`
      );
      finalSrtContent = rawResult.srtContent;
    }

    // ÉTAPE 6: Calculer les métriques finales
    const finalMetrics = calculateDetailedSrtMetrics(finalSrtContent);

    console.log(`[SRT Export Quality] 📊 RÉSULTAT FINAL:`);
    console.log(`- Sous-titres générés: ${finalMetrics.subtitleCount}`);
    console.log(
      `- CPS final min/max/moyen: ${finalMetrics.minCPS.toFixed(
        1
      )}/${finalMetrics.maxCPS.toFixed(1)}/${finalMetrics.avgCPS.toFixed(1)}`
    );
    console.log(
      `- Durée finale min/max/moy: ${finalMetrics.minDuration.toFixed(
        1
      )}s/${finalMetrics.maxDuration.toFixed(
        1
      )}s/${finalMetrics.avgDuration.toFixed(1)}s`
    );
    console.log(
      `- Contraintes appliquées: ${appliedConstraints ? "OUI" : "NON"}`
    );
    console.log(
      `- Contraintes respectées: CPS≤${finalMaxCPS} ${
        finalMetrics.maxCPS <= finalMaxCPS ? "✅" : "❌"
      }, Durée≤${finalMaxDuration}s ${
        finalMetrics.maxDuration <= finalMaxDuration ? "✅" : "❌"
      }`
    );

    // ÉTAPE 7: Prévisualisation
    const preview = finalSrtContent.substring(0, 500);
    console.log(
      `[SRT Export Quality] 👀 APERÇU:\n${preview}${
        finalSrtContent.length > 500 ? "\n..." : ""
      }`
    );

    // ÉTAPE 8: Sauvegarde et retour
    const exportDir = path.join(__dirname, "../../../srt_exports");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const qualitySuffix = `_quality_${Math.round(
      finalMaxCPS
    )}cps_${finalMinDuration}-${finalMaxDuration}s`;
    const filePath = path.join(
      exportDir,
      `session_${session_id}_grouped_${level}${qualitySuffix}.srt`
    );

    fs.writeFileSync(filePath, finalSrtContent, "utf8");
    console.log(`[SRT Export Quality] 💾 Sauvegardé à : ${filePath}`);

    res.setHeader("Content-Type", "application/x-subrip; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="session_${session_id}_grouped_${level}${qualitySuffix}.srt"`
    );

    return res.status(200).send(finalSrtContent);
  } catch (err) {
    console.error("❌ [SRT Export Quality] Erreur:", err);
    console.error("Stack trace:", err.stack);

    return res.status(500).json({
      message:
        "Erreur lors de la génération du SRT avec contraintes de qualité",
      error:
        process.env.NODE_ENV === "development" ? err.message : "Erreur interne",
      sessionId: session_id,
    });
  }
}

// Fonction pour calculer des métriques détaillées
function calculateDetailedSrtMetrics(srtContent) {
  const lines = srtContent.split("\n").filter((line) => line.trim());
  const subtitleCount = Math.floor(lines.length / 4);

  const durations = [];
  const cpsValues = [];
  const textLengths = [];

  for (let i = 0; i < lines.length; i += 4) {
    if (lines[i + 1] && lines[i + 1].includes("-->")) {
      const timeLine = lines[i + 1];
      const times = timeLine.split(" --> ");
      if (times.length === 2) {
        const startSeconds = srtTimeToSeconds(times[0]);
        const endSeconds = srtTimeToSeconds(times[1]);
        const duration = endSeconds - startSeconds;
        durations.push(duration);

        if (lines[i + 2]) {
          const textLength = lines[i + 2].length;
          textLengths.push(textLength);
          const cps = textLength / duration;
          cpsValues.push(cps);
        }
      }
    }
  }

  return {
    subtitleCount,
    avgDuration:
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0,
    maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
    minDuration: durations.length > 0 ? Math.min(...durations) : 0,
    avgCPS:
      cpsValues.length > 0
        ? cpsValues.reduce((a, b) => a + b, 0) / cpsValues.length
        : 0,
    maxCPS: cpsValues.length > 0 ? Math.max(...cpsValues) : 0,
    minCPS: cpsValues.length > 0 ? Math.min(...cpsValues) : 0,
    avgTextLength:
      textLengths.length > 0
        ? textLengths.reduce((a, b) => a + b, 0) / textLengths.length
        : 0,
  };
}

// Fonction pour appliquer manuellement les contraintes de qualité
function applyQualityConstraintsManually(srtContent, constraints) {
  const lines = srtContent.split("\n");
  const filteredLines = [];
  let subtitleIndex = 1;

  console.log(
    `[Quality Filter] Application manuelle des contraintes:`,
    constraints
  );

  for (let i = 0; i < lines.length; i += 4) {
    if (i + 3 < lines.length) {
      const timeLine = lines[i + 1];
      const textLine = lines[i + 2];

      if (timeLine && timeLine.includes("-->") && textLine) {
        const times = timeLine.split(" --> ");
        if (times.length === 2) {
          const startSeconds = srtTimeToSeconds(times[0]);
          const endSeconds = srtTimeToSeconds(times[1]);
          const duration = endSeconds - startSeconds;
          const cps = textLine.length / duration;

          // Vérifier les contraintes
          const durationOk =
            duration >= constraints.minDuration &&
            duration <= constraints.maxDuration;
          const cpsOk = cps <= constraints.maxCPS;

          if (durationOk && cpsOk) {
            // Garder ce sous-titre
            filteredLines.push(subtitleIndex.toString());
            filteredLines.push(timeLine);
            filteredLines.push(textLine);
            filteredLines.push(""); // Ligne vide
            subtitleIndex++;
          } else {
            console.log(
              `[Quality Filter] Sous-titre rejeté: durée=${duration.toFixed(
                1
              )}s (${durationOk ? "✅" : "❌"}), CPS=${cps.toFixed(1)} (${
                cpsOk ? "✅" : "❌"
              })`
            );

            // Tentative de division du sous-titre si CPS trop élevé
            if (!cpsOk && duration > constraints.minDuration * 2) {
              const splitSubtitles = splitLongSubtitle(
                textLine,
                startSeconds,
                endSeconds,
                constraints.maxCPS
              );

              for (const split of splitSubtitles) {
                const splitDuration = split.endTime - split.startTime;
                if (
                  splitDuration >= constraints.minDuration &&
                  splitDuration <= constraints.maxDuration
                ) {
                  filteredLines.push(subtitleIndex.toString());
                  filteredLines.push(
                    formatSrtTime(split.startTime) +
                      " --> " +
                      formatSrtTime(split.endTime)
                  );
                  filteredLines.push(split.text);
                  filteredLines.push("");
                  subtitleIndex++;
                  console.log(
                    `[Quality Filter] Sous-titre divisé accepté: durée=${splitDuration.toFixed(
                      1
                    )}s, CPS=${(split.text.length / splitDuration).toFixed(1)}`
                  );
                }
              }
            }
          }
        }
      }
    }
  }

  const result = filteredLines.join("\n");
  console.log(
    `[Quality Filter] Résultat: ${Math.floor(
      filteredLines.length / 4
    )} sous-titres conservés`
  );

  return result;
}

// Fonction pour diviser un sous-titre long
function splitLongSubtitle(text, startTime, endTime, maxCPS) {
  const totalDuration = endTime - startTime;
  const currentCPS = text.length / totalDuration;

  if (currentCPS <= maxCPS) {
    return [{ text, startTime, endTime }];
  }

  // Calculer combien de parties sont nécessaires
  const partsNeeded = Math.ceil(currentCPS / maxCPS);
  const charsPerPart = Math.floor(text.length / partsNeeded);
  const timePerPart = totalDuration / partsNeeded;

  const parts = [];

  for (let i = 0; i < partsNeeded; i++) {
    const start = i * charsPerPart;
    const end = i === partsNeeded - 1 ? text.length : (i + 1) * charsPerPart;

    // Essayer de couper sur un espace pour éviter de couper les mots
    let cutEnd = end;
    if (end < text.length && text[end] !== " ") {
      const nextSpace = text.indexOf(" ", end);
      const prevSpace = text.lastIndexOf(" ", end);

      if (nextSpace !== -1 && nextSpace - end < 10) {
        cutEnd = nextSpace;
      } else if (prevSpace !== -1 && end - prevSpace < 10) {
        cutEnd = prevSpace;
      }
    }

    const partText = text.substring(start, cutEnd).trim();
    const partStartTime = startTime + i * timePerPart;
    const partEndTime =
      i === partsNeeded - 1 ? endTime : startTime + (i + 1) * timePerPart;

    if (partText.length > 0) {
      parts.push({
        text: partText,
        startTime: partStartTime,
        endTime: partEndTime,
      });
    }
  }

  return parts;
}

// Fonction utilitaire pour formater le temps SRT
function formatSrtTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")},${milliseconds
    .toString()
    .padStart(3, "0")}`;
}

// Fonction pour convertir le temps SRT en secondes
function srtTimeToSeconds(timeString) {
  const parts = timeString.split(":");
  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const secondsParts = parts[2].split(",");
  const seconds = parseInt(secondsParts[0]);
  const milliseconds = parseInt(secondsParts[1]);

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}
/**
 * Controller pour tester uniquement la correction LanguageTool sur un texte
 * Utile pour debugger les corrections
 */
async function testLanguageToolController(req, res) {
  const { text, language = "fr" } = req.body;

  if (!text) {
    return res.status(400).json({
      message: "Le paramètre 'text' est requis",
    });
  }

  try {
    console.log(
      `[LanguageTool Test] Test correction pour: "${text.substring(0, 50)}..."`
    );

    const correctedText = await correctTextWithLanguageTool(text, language);

    return res.status(200).json({
      original: text,
      corrected: correctedText,
      language: language,
      changed: text !== correctedText,
    });
  } catch (err) {
    console.error("❌ Erreur test LanguageTool :", err);
    return res.status(500).json({
      message: "Erreur lors du test LanguageTool",
      error: err.message,
    });
  }
}

/**
 * Controller pour correction par lot de textes
 */
async function correctTextsBatchController(req, res) {
  const { texts, language = "fr" } = req.body;

  if (!texts || !Array.isArray(texts)) {
    return res.status(400).json({
      message: "Le paramètre 'texts' doit être un tableau",
    });
  }

  try {
    console.log(`[LanguageTool Batch] Correction de ${texts.length} textes...`);

    const correctedTexts = await correctTextsBatch(texts, language);

    const stats = {
      total: texts.length,
      processed: correctedTexts.length,
      changed: correctedTexts.filter((text, index) => text !== texts[index])
        .length,
    };

    console.log(`[LanguageTool Batch] ✅ Stats: ${JSON.stringify(stats)}`);

    return res.status(200).json({
      original: texts,
      corrected: correctedTexts,
      stats: stats,
      language: language,
    });
  } catch (err) {
    console.error("❌ Erreur correction batch :", err);
    return res.status(500).json({
      message: "Erreur lors de la correction par lot",
      error: err.message,
    });
  }
}

/**
 * Controller pour obtenir la configuration LanguageTool
 */
function getLanguageToolConfigController(req, res) {
  return res.status(200).json({
    config: LANGUAGETOOL_CONFIG,
    availableLanguages: ["fr", "en", "es", "de", "it", "pt"], // Ajustez selon vos besoins
    message: "Configuration LanguageTool",
  });
}
module.exports = {
  exportSrtImprovedController,
  exportSrtFlexibleController,
  exportSrtComparisonController,
  exportSrtCorrectedController,
  exportSrtQualityController,
  testLanguageToolController,
  correctTextsBatchController,
  getLanguageToolConfigController,
};
