const axios = require;
const SubtitleModel = require("../models/SubtitleModel"); // Ajuste le chemin si nécessaire
const VideoSegmentModel = require("../models/VideoSegmentModel"); // Pour accéder aux segments voisins
const { verifierTexte } = require("../utils/correction");
const levenshtein = require("fast-levenshtein");

const fs = require("fs");
const path = require("path");

const dictionnairePath = path.join(__dirname, "../../data/dictionnaire.txt"); // adapte le chemin selon ton arborescence

const dictionnaire = new Set(
  fs
    .readFileSync(dictionnairePath, "utf-8")
    .split("\n")
    .map((mot) => mot.trim().toLowerCase())
    .filter(Boolean)
);

console.log(`Dictionnaire chargé avec ${dictionnaire.size} mots`);

// Normalisation minimale (supprime ponctuation en bord, met en minuscules)
function normalizeWord(w) {
  return (
    w
      .trim()
      .toLowerCase()
      // enlève seulement la ponctuation, conserve toutes les lettres (y compris é, à, û…)
      .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
  );
}

const rawDict = fs
  .readFileSync(dictionnairePath, "utf-8")
  .split("\n")
  .map((m) => m.trim())
  .filter(Boolean);
const dict = new Set(rawDict);
const dictNorm = new Set(rawDict.map((w) => normalizeWord(w)));

function correctWord(rawWord) {
  const containsAccent = /[^\u0000-\u007F]/.test(rawWord);
  const norm = normalizeWord(rawWord);
  if (dictNorm.has(norm)) return rawWord;

  // Si on a un accent et qu'il est dans le dict normalisé, on le garde tel quel
  if (containsAccent && dictNorm.has(norm)) {
    return rawWord;
  }
  // Sinon, si le mot normalisé existe, on garde l'original (sans le toucher)
  if (dictNorm.has(norm)) {
    return rawWord;
  }

  // On cherche parmi dictNorm un mot à distance 1 et de longueur proche
  let best = rawWord;
  let bestDist = Infinity;

  for (const cand of dictNorm) {
    if (Math.abs(cand.length - norm.length) > 1) continue;
    const d = levenshtein.get(norm, cand);
    if (d < bestDist) {
      bestDist = d;
      best = cand;
      if (d === 1) break;
    }
  }

  if (bestDist === 1) {
    // On retourne la forme **brute** du dictionnaire (avec accent éventuel)
    // On recherche dans rawDict l’entrée qui correspond
    const rawCand = rawDict.find((w) => normalizeWord(w) === best);
    console.log(`Correction orthographique : "${rawWord}" → "${rawCand}"`);
    return rawCand;
  }

  // Sinon, on ne touche pas
  return rawWord;
}

function correctText(text) {
  return text
    .split(/\s+/)
    .map((w) => correctWord(w))
    .join(" ");
}

// function handleOverlap(text1, text2) {
//   // Utilise des mots pour détecter le chevauchement
//   const overlap = detectOverlapWithThreshold(text1, text2, 5); // Seuil de 5 caractères
//   if (overlap) {
//     console.log(`Chevauchement détecté : "${overlap}"`);
//     const adjustedText1 = text1.slice(0, -overlap.length).trim();
//     const adjustedText2 = text2.slice(overlap.length).trim();
//     return { adjustedText1, adjustedText2 };
//   }

//   return { adjustedText1: text1, adjustedText2: text2 };
// }

// async function adjustTextWithNeighbors(currentSegment, text) {
//   const previousSegment = await VideoSegmentModel.getPreviousSegment(
//     currentSegment.segment_id
//   );
//   const nextSegment = await VideoSegmentModel.getNextSegment(
//     currentSegment.segment_id
//   );

//   if (previousSegment) {
//     const previousSubtitles = await SubtitleModel.getSubtitlesBySegment(
//       previousSegment.segment_id
//     );

//     for (let subtitle of previousSubtitles) {
//       const { adjustedText1, adjustedText2 } = handleOverlap(
//         subtitle.text,
//         text
//       );
//       text = adjustedText2; // Ajuster le texte courant
//     }
//   }

//   if (nextSegment) {
//     const nextSubtitles = await SubtitleModel.getSubtitlesBySegment(
//       nextSegment.segment_id
//     );

//     for (let subtitle of nextSubtitles) {
//       const { adjustedText1, adjustedText2 } = handleOverlap(
//         text,
//         subtitle.text
//       );
//       text = adjustedText1; // Ajuster le texte courant
//     }
//   }

//   return text;
// }

// function detectOverlap(text1, text2) {
//   const minLength = Math.min(text1.length, text2.length);
//   for (let i = 1; i <= minLength; i++) {
//     if (text1.slice(-i) === text2.slice(0, i)) {
//       return text1.slice(-i); // Retourner la partie qui se chevauche
//     }
//   }
//   return null; // Aucun chevauchement détecté
// }
// function detectOverlapWithThreshold(text1, text2, minOverlapLength = 5) {
//   const words1 = text1.split(" ");
//   const words2 = text2.split(" ");

//   let overlap = "";

//   for (let i = 1; i <= Math.min(words1.length, words2.length); i++) {
//     const lastWords1 = words1.slice(-i).join(" ");
//     const firstWords2 = words2.slice(0, i).join(" ");

//     if (lastWords1 === firstWords2 && lastWords1.length >= minOverlapLength) {
//       overlap = lastWords1;
//     }
//   }

//   return overlap || null;
// }

// module.exports = {
//   detectOverlap, // Assure-toi que detectOverlap est bien exportée
//   handleOverlap,
//   adjustTextWithNeighbors,
//   detectOverlapWithThreshold,
// };
async function adjustTextWithNeighbors(currentSegment, text) {
  const previousSegment = await VideoSegmentModel.getPreviousSegment(
    currentSegment.segment_id
  );
  const nextSegment = await VideoSegmentModel.getNextSegment(
    currentSegment.segment_id
  );

  if (previousSegment) {
    const previousSubtitles = await SubtitleModel.getSubtitlesBySegment(
      previousSegment.segment_id
    );

    for (let subtitle of previousSubtitles) {
      const { adjustedText1, adjustedText2, overlap } = handleOverlapWithWords(
        subtitle.text,
        text
      );
      if (overlap) {
        console.log(
          `Ajustement avec le segment précédent ${previousSegment.segment_id} : "${overlap}"`
        );
      }
      text = adjustedText2; // Ajuste le texte courant
    }
  }

  if (nextSegment) {
    const nextSubtitles = await SubtitleModel.getSubtitlesBySegment(
      nextSegment.segment_id
    );

    for (let subtitle of nextSubtitles) {
      const { adjustedText1, adjustedText2, overlap } = handleOverlapWithWords(
        text,
        subtitle.text
      );
      if (overlap) {
        console.log(
          `Ajustement avec le segment suivant ${nextSegment.segment_id} : "${overlap}"`
        );
      }
      text = adjustedText1; // Ajuste le texte courant
    }
  }

  return text;
}
async function adjustTextWithNeighborsCustom(
  currentText,
  previousTexts = [],
  nextTexts = []
) {
  let text = currentText;
  console.log("Adjustement avec voisins:");
  console.log("Texte courant:", currentText);
  console.log("Textes précédents:", previousTexts);
  console.log("Textes suivants:", nextTexts);

  let overlapDetected = false;

  for (const prevText of previousTexts) {
    const { adjustedText1, adjustedText2, overlap } =
      handleOverlapWithWordsFuzzy(prevText, text);
    if (overlap) {
      console.log(`Chevauchement détecté avec précédent: "${overlap}"`);
      overlapDetected = true;
    }
    text = adjustedText2;
  }

  for (const nextText of nextTexts) {
    const { adjustedText1, adjustedText2, overlap } =
      handleOverlapWithWordsFuzzy(text, nextText);
    if (overlap) {
      console.log(`Chevauchement détecté avec suivant: "${overlap}"`);
      overlapDetected = true;
    }
    text = adjustedText1;
  }

  if (!overlapDetected) {
    console.log("Aucun chevauchement détecté avec les voisins.");
  }

  return text;
}

function handleOverlapWithWords(text1, text2) {
  const words1 = text1.split(" "); // Découpe text1 en mots
  const words2 = text2.split(" "); // Découpe text2 en mots

  let overlap = "";

  // Parcours pour détecter les mots identiques entre la fin de text1 et le début de text2
  for (let i = 1; i <= Math.min(words1.length, words2.length); i++) {
    const lastWords1 = words1.slice(-i).join(" "); // Fin de text1
    const firstWords2 = words2.slice(0, i).join(" "); // Début de text2

    if (lastWords1 === firstWords2) {
      overlap = lastWords1; // Chevauchement détecté
    }
  }

  if (overlap) {
    console.log(`Chevauchement détecté : "${overlap}"`);
    const adjustedText1 = text1.slice(0, -overlap.length).trim();
    const adjustedText2 = text2.slice(overlap.length).trim();

    return { adjustedText1, adjustedText2, overlap };
  }

  return { adjustedText1: text1, adjustedText2: text2, overlap: null };
}
function normalizeText(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]/g, "");
}

function handleOverlapWithWords(text1, text2) {
  const words1 = normalizeText(text1).split(" ");
  const words2 = normalizeText(text2).split(" ");

  let overlap = "";

  for (let i = Math.min(words1.length, words2.length); i > 0; i--) {
    const lastWords1 = words1.slice(-i).join(" ");
    const firstWords2 = words2.slice(0, i).join(" ");

    if (lastWords1 === firstWords2) {
      overlap = lastWords1;
      break; // On arrête dès qu'on trouve le plus grand chevauchement
    }
  }

  if (overlap) {
    console.log(`Chevauchement détecté : "${overlap}"`);
    // Retirer la longueur du chevauchement à partir des textes originaux non normalisés
    const adjustedText1 = text1.slice(0, text1.length - overlap.length).trim();
    const adjustedText2 = text2.slice(overlap.length).trim();

    return { adjustedText1, adjustedText2, overlap };
  }

  return { adjustedText1: text1, adjustedText2: text2, overlap: null };
}

function motCorrect(mot) {
  return dictionnaire.has(mot.toLowerCase());
}

function normalizeWord(w) {
  return w.toLowerCase().replace(/[.,!?;:'"]/g, "");
}

function similarWords(w1, w2) {
  const dist = levenshtein.get(normalizeWord(w1), normalizeWord(w2));
  console.log(`Distance entre "${w1}" et "${w2}" = ${dist}`);
  return dist <= 2;
}

// Choisir le mot correct entre deux mots similaires
function choisirMotCorrect(mot1, mot2) {
  const m1 = mot1.toLowerCase();
  const m2 = mot2.toLowerCase();
  const mot1Correct = dictionnaire.has(m1);
  const mot2Correct = dictionnaire.has(m2);

  if (mot1Correct && !mot2Correct) {
    console.log(
      `choisirMotCorrect : "${mot1}" est correct, "${mot2}" ne l'est pas.`
    );
    return mot1;
  }
  if (!mot1Correct && mot2Correct) {
    console.log(
      `choisirMotCorrect : "${mot2}" est correct, "${mot1}" ne l'est pas.`
    );
    return mot2;
  }

  // Si les deux sont corrects ou incorrects, on choisit celui le plus proche en longueur (ou autre critère)
  const chosen = mot1.length <= mot2.length ? mot1 : mot2;
  console.log(
    `choisirMotCorrect : indécis, choisi "${chosen}" entre "${mot1}" et "${mot2}".`
  );
  return chosen;
}

// Fonction fuzzy de détection et correction de chevauchement
function handleOverlapWithWordsFuzzy(text1, text2) {
  // 1) On split brut, on garde rawWords1/rawWords2
  const rawWords1 = text1.trim().split(/\s+/);
  const rawWords2 = text2.trim().split(/\s+/);

  // On garde aussi les versions normalisées pour la comparaison fuzzy
  const words1 = rawWords1.map((w) => normalizeWord(w));
  const words2 = rawWords2.map((w) => normalizeWord(w));

  // 2) Détection de la plus longue séquence chevauchante fuzzy
  let overlapLength = 0;
  let overlapWords1 = [];
  let overlapWords2 = [];
  for (let i = Math.min(words1.length, words2.length); i > 0; i--) {
    const last1 = words1.slice(-i);
    const first2 = words2.slice(0, i);
    let allSim = true;
    for (let j = 0; j < i; j++) {
      if (!similarWords(last1[j], first2[j])) {
        allSim = false;
        break;
      }
    }
    if (allSim) {
      overlapLength = i;
      overlapWords1 = rawWords1.slice(-i); // on garde les bruts
      overlapWords2 = rawWords2.slice(0, i);
      break;
    }
  }

  if (overlapLength === 0) {
    return { adjustedText1: text1, adjustedText2: text2, overlap: null };
  }

  // 3) Correction mot à mot, en conservant l’accent
  const correctedWords = [];
  for (let k = 0; k < overlapLength; k++) {
    const mot1 = overlapWords1[k];
    const mot2 = overlapWords2[k];
    // On passe mot1 et mot2 bruts à choisirMotCorrect
    const motCorrect = choisirMotCorrect(mot1, mot2);
    console.log(
      `choisirMotCorrect appelé avec "${mot1}" et "${mot2}" => "${motCorrect}"`
    );
    correctedWords.push(motCorrect);
  }
  const correctedOverlap = correctedWords.join(" ");

  // 4) Reconstruit le segment précédent
  const adjustedWords1 = rawWords1
    .slice(0, rawWords1.length - overlapLength)
    .concat(correctedWords);

  // 5) Reconstruit le segment courant (on supprime le chevauchement)
  const adjustedWords2 = rawWords2.slice(overlapLength);

  return {
    adjustedText1: adjustedWords1.join(" ").trim(),
    adjustedText2: adjustedWords2.join(" ").trim(),
    overlap: correctedOverlap,
  };
}

// Helpers à intégrer dans le même fichier :
function normalizeWord(w) {
  return w.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "");
}

function similarWords(w1, w2) {
  const n1 = normalizeWord(w1);
  const n2 = normalizeWord(w2);
  const dist = levenshtein.get(n1, n2);

  // Pour les mots très courts, ne pas tolérer d’erreur
  if (Math.max(n1.length, n2.length) <= 3) {
    return dist === 0;
  }

  // Pour les autres, tolérer 1 seule modification (insert, delete ou sub)
  return dist <= 1;
}

module.exports = {
  adjustTextWithNeighbors,
  handleOverlapWithWords,
  adjustTextWithNeighborsCustom,
  motCorrect,
  choisirMotCorrect,
  similarWords,
  handleOverlapWithWordsFuzzy,
  correctText,
  correctWord,
  normalizeWord,
};
