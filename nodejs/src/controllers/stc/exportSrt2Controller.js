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
  testLanguageToolController,
  correctTextsBatchController,
  getLanguageToolConfigController,
};
