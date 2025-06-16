// ========================================
// TESTS RAPIDES À COLLER DANS TON TERMINAL NODE
// ========================================

// 🔥 TEST RAPIDE 1: Déduplication basique
const { basicTextDeduplication } = require("./basicDeduplication");
const testText = "bonjour bonjour comment comment allez-vous euh ben";
console.log("Original:", testText);
console.log("Nettoyé:", basicTextDeduplication(testText));

// 🔥 TEST RAPIDE 2: Comparaison des niveaux
const {
  intermediateTextDeduplication,
} = require("./intermediateDeduplication");
const complexText =
  "je pense vraiment je pense que c'est important vraiment important";
console.log("\n--- Comparaison des niveaux ---");
console.log("Original:", complexText);
console.log("Basic:", basicTextDeduplication(complexText));
console.log("Intermediate:", intermediateTextDeduplication(complexText));

// 🔥 TEST RAPIDE 3: Avec tes données (remplace SESSION_ID)
async function quickTestRealData() {
  try {
    const { generateImprovedSrt } = require("./hybridSrtGenerator");

    console.log("\n--- Test avec niveau OFF ---");
    const resultOff = await generateImprovedSrt("TU_SESSION_ID", {
      level: "off",
    });

    console.log("\n--- Test avec niveau BASIC ---");
    const resultBasic = await generateImprovedSrt("TU_SESSION_ID", {
      level: "basic",
    });

    console.log("Comparaison longueurs:");
    console.log("Sans dédup:", resultOff.length);
    console.log("Avec basic:", resultBasic.length);
    console.log(
      "Réduction:",
      (
        ((resultOff.length - resultBasic.length) / resultOff.length) *
        100
      ).toFixed(1) + "%"
    );
  } catch (error) {
    console.error("Erreur:", error.message);
  }
}

// Exécuter le test (décommenter et remplacer SESSION_ID)
// quickTestRealData();

// ========================================
// TESTS CURL POUR TES ENDPOINTS
// ========================================

/*
# Test sans déduplication
curl -I "http://localhost:3000/api/srt/export/123"

# Test déduplication basique
curl -I "http://localhost:3000/api/srt/export/123?level=basic"

# Test déduplication intermédiaire
curl -I "http://localhost:3000/api/srt/export/123?level=intermediate"

# Test avec paramètres personnalisés
curl -I "http://localhost:3000/api/srt/export/123?level=intermediate&threshold=0.5&windowSize=3"

# Télécharger le fichier pour vérifier le contenu
curl -o "test_basic.srt" "http://localhost:3000/api/srt/export/123?level=basic"
curl -o "test_intermediate.srt" "http://localhost:3000/api/srt/export/123?level=intermediate"
*/

// ========================================
// FONCTION DE DEBUG POUR TES SEGMENTS
// ========================================
async function debugSegment(session_id, segment_index = 0) {
  try {
    const VideoSegmentModel = require("../models/VideoSegmentModel");
    const SubtitleModel = require("../models/SubtitleModel");

    const segments = await VideoSegmentModel.findManyBy({ session_id });
    const segment = segments[segment_index];

    if (!segment) {
      console.log("❌ Segment non trouvé");
      return;
    }

    console.log(`🔍 Debug Segment ${segment.segment_id}:`);

    const subtitles = await SubtitleModel.getSubtitlesBySegment(
      segment.segment_id
    );
    const originalText = subtitles.map((s) => s.text).join(" ");

    console.log(`📝 Texte original (${originalText.split(" ").length} mots):`);
    console.log(`"${originalText}"`);

    console.log(`\n🧹 Après déduplication basique:`);
    const basicResult = basicTextDeduplication(originalText);
    console.log(`"${basicResult}" (${basicResult.split(" ").length} mots)`);

    console.log(`\n🔬 Après déduplication intermédiaire:`);
    const intResult = intermediateTextDeduplication(originalText);
    console.log(`"${intResult}" (${intResult.split(" ").length} mots)`);

    const reductionBasic = (
      ((originalText.length - basicResult.length) / originalText.length) *
      100
    ).toFixed(1);
    const reductionInt = (
      ((originalText.length - intResult.length) / originalText.length) *
      100
    ).toFixed(1);

    console.log(`\n📊 Réductions:`);
    console.log(`Basic: ${reductionBasic}%`);
    console.log(`Intermediate: ${reductionInt}%`);
  } catch (error) {
    console.error("❌ Erreur debug:", error.message);
  }
}

// Pour débugger un segment spécifique
// debugSegment('TON_SESSION_ID', 0); // Premier segment

module.exports = { debugSegment };
