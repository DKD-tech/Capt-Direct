// Exemples de textes pour tester la déduplication

// ========== CAS 1: DOUBLONS EXACTS ==========
const duplicatesExacts = [
  "Bonjour tout le monde",
  "Bonjour tout le monde",
  "Comment allez-vous ?",
  "Bonjour tout le monde",
  "Comment allez-vous ?",
  "Au revoir",
];
// Résultat attendu : 3 textes uniques

// ========== CAS 2: VARIATIONS MINEURES (ponctuation) ==========
const variationsMineur = [
  "Bonjour tout le monde",
  "Bonjour, tout le monde !",
  "Bonjour tout le monde.",
  "Comment ça va ?",
  "Comment ça va",
  "Comment ca va ?",
];
// Résultat attendu : 2 textes uniques (seuil 0.7)

// ========== CAS 3: SIMILARITÉ ÉLEVÉE ==========
const similariteElevee = [
  "Je vais au magasin",
  "Je vais au supermarché",
  "Je me rends au magasin",
  "Il fait beau aujourd'hui",
  "Le temps est magnifique aujourd'hui",
  "Aujourd'hui il fait très beau",
];
// Résultat attendu : dépend du seuil (0.7 vs 0.8)

// ========== CAS 4: TEXTES COURTS PROBLÉMATIQUES ==========
const texteCourts = [
  "Oui",
  "Non",
  "OK",
  "D'accord",
  "Bien",
  "Oui oui",
  "Non non",
  "OK OK",
];
// Test : textes < 3 caractères après normalisation

// ========== CAS 5: TRANSCRIPTION RÉELLE (simulation) ==========
const transcriptionReelle = [
  "Alors aujourd'hui nous allons parler de JavaScript",
  "Aujourd'hui nous allons parler de JavaScript donc",
  "Nous allons parler de JavaScript aujourd'hui",
  "JavaScript est un langage de programmation",
  "Le JavaScript c'est un langage de programmation",
  "C'est un langage de programmation que JavaScript",
  "Il est très populaire dans le développement web",
  "Très populaire pour le développement web",
  "Pour le développement web c'est très populaire",
];
// Cas typique de transcription avec répétitions et reformulations

// ========== CAS 6: LANGUES MIXTES ==========
const languesMixtes = [
  "Hello world",
  "Bonjour le monde",
  "Hello tout le monde",
  "Salut world",
  "Good morning",
  "Bonjour",
];
// Test avec mélange français/anglais

// ========== FONCTION DE TEST ==========
function testDeduplication() {
  console.log("=== TEST DE DÉDUPLICATION ===\n");

  const testCases = [
    { name: "Doublons exacts", data: duplicatesExacts },
    { name: "Variations mineures", data: variationsMineur },
    { name: "Similarité élevée", data: similariteElevee },
    { name: "Textes courts", data: texteCourts },
    { name: "Transcription réelle", data: transcriptionReelle },
    { name: "Langues mixtes", data: languesMixtes },
  ];

  testCases.forEach((testCase) => {
    console.log(`--- ${testCase.name.toUpperCase()} ---`);
    console.log("Textes originaux:", testCase.data.length);
    testCase.data.forEach((text, i) => console.log(`${i + 1}. "${text}"`));

    // Test avec seuil 0.7
    const result07 = deduplicateTexts(testCase.data, 0.7);
    console.log(`\nAprès déduplication (seuil 0.7): ${result07.length} textes`);
    result07.forEach((text, i) => console.log(`${i + 1}. "${text}"`));

    // Test avec seuil 0.8
    const result08 = deduplicateTexts(testCase.data, 0.8);
    console.log(`\nAprès déduplication (seuil 0.8): ${result08.length} textes`);
    result08.forEach((text, i) => console.log(`${i + 1}. "${text}"`));

    console.log("\n" + "=".repeat(50) + "\n");
  });
}

// ========== TESTS INDIVIDUELS POUR DEBUG ==========
function testJaccardSimilarity() {
  console.log("=== TEST SIMILARITÉ JACCARD ===\n");

  const pairs = [
    ["Bonjour tout le monde", "Bonjour, tout le monde !"],
    ["Je vais au magasin", "Je vais au supermarché"],
    ["Il fait beau", "Le temps est magnifique"],
    ["JavaScript est cool", "Python est cool"],
    ["Oui", "Non"],
    ["Hello world", "Bonjour le monde"],
  ];

  pairs.forEach(([text1, text2]) => {
    const similarity = calculateJaccardSimilarity(
      text1
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .trim(),
      text2
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .trim()
    );

    console.log(`"${text1}" vs "${text2}"`);
    console.log(`Similarité: ${(similarity * 100).toFixed(1)}%`);
    console.log(`Seuil 0.7: ${similarity > 0.7 ? "REJETÉ" : "ACCEPTÉ"}`);
    console.log(`Seuil 0.8: ${similarity > 0.8 ? "REJETÉ" : "ACCEPTÉ"}`);
    console.log("---");
  });
}

// ========== SIMULATION COMPLÈTE ==========
function simulationComplete() {
  console.log("=== SIMULATION SEGMENTS VIDÉO ===\n");

  // Simulation de 3 segments vidéo avec sous-titres
  const segments = [
    {
      segment_id: 1,
      start_time: "00:00:00",
      end_time: "00:00:10",
      subtitles: [
        "Bonjour et bienvenue",
        "Bonjour, bienvenue !",
        "Bienvenue dans cette présentation",
      ],
    },
    {
      segment_id: 2,
      start_time: "00:00:10",
      end_time: "00:00:20",
      subtitles: [
        "Nous allons parler de JavaScript",
        "Aujourd'hui on va parler de JavaScript",
        "JavaScript sera notre sujet principal",
      ],
    },
    {
      segment_id: 3,
      start_time: "00:00:20",
      end_time: "00:00:30",
      subtitles: [
        "C'est un langage très populaire",
        "Très populaire ce langage",
        "JavaScript est vraiment populaire",
        "Merci de votre attention",
      ],
    },
  ];

  segments.forEach((segment) => {
    console.log(
      `Segment ${segment.segment_id} (${segment.start_time} - ${segment.end_time})`
    );
    console.log("Sous-titres bruts:", segment.subtitles);

    const deduplicated = deduplicateTexts(segment.subtitles, 0.7);
    console.log("Après déduplication:", deduplicated);

    const combined = deduplicated.join(" ");
    console.log("Texte final:", `"${combined}"`);
    console.log("---");
  });
}

// Pour exécuter les tests :
// testDeduplication();
// testJaccardSimilarity();
// simulationComplete();
