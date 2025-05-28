const axios = require;
const SubtitleModel = require("../models/SubtitleModel"); // Ajuste le chemin si nécessaire
const VideoSegmentModel = require("../models/VideoSegmentModel"); // Pour accéder aux segments voisins
const { verifierTexte } = require("../utils/correction");
const levenshtein = require('fast-levenshtein');

const fs = require('fs');
const path = require('path');

const dictionnairePath = path.join(__dirname, '../../data/dictionnaire.txt'); // adapte le chemin selon ton arborescence

const dictionnaire = new Set(
  fs.readFileSync(dictionnairePath, 'utf-8')
    .split('\n')
    .map(mot => mot.trim().toLowerCase())
    .filter(Boolean)
);

console.log(`Dictionnaire chargé avec ${dictionnaire.size} mots`);

// Normalisation minimale (supprime ponctuation en bord, met en minuscules)
// Normalisation minimale : minuscules, retrait ponctuation de bord
function normalizeWord(w) {
  return w
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

// Recherche de la plus longue suite de mots (border) entre fin de words1 et début de words2
function longestWordBorder(words1, words2) {
  const maxLen = Math.min(words1.length, words2.length);
  for (let L = maxLen; L > 0; L--) {
    const suffix = words1.slice(-L).join(' ');
    const prefix = words2.slice(0, L).join(' ');
    if (suffix === prefix) {
      return suffix.split(' ');
    }
  }
  return [];
}

const rawDict = fs.readFileSync(dictionnairePath, 'utf-8')
  .split('\n').map(m=>m.trim()).filter(Boolean);
const dict = new Set(rawDict);
const dictNorm = new Set(rawDict.map(w => normalizeWord(w)));


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
  let best     = rawWord;
  let bestDist = Infinity;

  for (const cand of dictNorm) {
    if (Math.abs(cand.length - norm.length) > 1) continue;
    const d = levenshtein.get(norm, cand);
    if (d < bestDist) {
      bestDist = d;
      best     = cand;
      if (d === 1) break;
    }
  }

  if (bestDist === 1) {
    // On retourne la forme **brute** du dictionnaire (avec accent éventuel)
    // On recherche dans rawDict l’entrée qui correspond
    const rawCand = rawDict.find(w => normalizeWord(w) === best);
    console.log(`Correction orthographique : "${rawWord}" → "${rawCand}"`);
    return rawCand;
  }

  // Sinon, on ne touche pas
  return rawWord;
}

function correctText(text) {
  return text
    .split(/\s+/)
    .map(w => correctWord(w))
    .join(' ');
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
async function adjustTextWithNeighborsCustom(currentText, previousTexts = [], nextTexts = []) {
  let text = currentText;
  console.log('Adjustement avec voisins:');
  console.log('Texte courant:', currentText);
  console.log('Textes précédents:', previousTexts);
  console.log('Textes suivants:', nextTexts);

  let overlapDetected = false;

  for (const prevText of previousTexts) {
    const { adjustedText1, adjustedText2, overlap } = handleOverlapWithWordsFuzzy(prevText, text);
    if (overlap) {
      console.log(`Chevauchement détecté avec précédent: "${overlap}"`);
      overlapDetected = true;
    }
    text = adjustedText2;
  }

  for (const nextText of nextTexts) {
    const { adjustedText1, adjustedText2, overlap } = handleOverlapWithWordsFuzzy(text, nextText);
    if (overlap) {
      console.log(`Chevauchement détecté avec suivant: "${overlap}"`);
      overlapDetected = true;
    }
    text = adjustedText1;
  }

  if (!overlapDetected) {
    console.log('Aucun chevauchement détecté avec les voisins.');
  }

  return text;
}



function normalizeText(str) {
  return str.trim().toLowerCase().replace(/[.,!?;:]/g, '');
}

function handleOverlapWithWords(text1, text2) {
  const rawWords1 = text1.trim().split(/\s+/);
  const rawWords2 = text2.trim().split(/\s+/);
  const normWords1 = rawWords1.map(normalizeWord);
  const normWords2 = rawWords2.map(normalizeWord);

  const overlapWords = longestWordBorder(normWords1, normWords2);
  if (!overlapWords.length) {
    return { adjustedText1: text1, adjustedText2: text2, overlap: null };
  }

  const overlap = overlapWords.join(' ');
  const adjustedText1 = rawWords1
    .slice(0, rawWords1.length - overlapWords.length)
    .join(' ')
    .trim();
  const adjustedText2 = rawWords2
    .slice(overlapWords.length)
    .join(' ')
    .trim();

  return { adjustedText1, adjustedText2, overlap };
}

function motCorrect(mot) {
  return dictionnaire.has(mot.toLowerCase());
}

function normalizeWord(w) {
  return w.toLowerCase().replace(/[.,!?;:'"]/g, '');
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
    console.log(`choisirMotCorrect : "${mot1}" est correct, "${mot2}" ne l'est pas.`);
    return mot1;
  }
  if (!mot1Correct && mot2Correct) {
    console.log(`choisirMotCorrect : "${mot2}" est correct, "${mot1}" ne l'est pas.`);
    return mot2;
  }

  // Si les deux sont corrects ou incorrects, on choisit celui le plus proche en longueur (ou autre critère)
  const chosen = mot1.length <= mot2.length ? mot1 : mot2;
  console.log(`choisirMotCorrect : indécis, choisi "${chosen}" entre "${mot1}" et "${mot2}".`);
  return chosen;
}

// Fonction fuzzy de détection et correction de chevauchement
function handleOverlapWithWordsFuzzy(text1, text2) {
  const rawWords1 = text1.trim().split(/\s+/);
  const rawWords2 = text2.trim().split(/\s+/);
  const normWords1 = rawWords1.map(normalizeWord);
  const normWords2 = rawWords2.map(normalizeWord);

  let overlapLength = 0;
  for (let i = Math.min(normWords1.length, normWords2.length); i > 0; i--) {
    let allSim = true;
    for (let j = 0; j < i; j++) {
      const w1 = normWords1[normWords1.length - i + j];
      const w2 = normWords2[j];
      const dist = levenshtein.get(w1, w2);
      // tolérance : 1 pour mots courts, 20% pour les autres
      const threshold = Math.max(1, Math.floor(w1.length * 0.2));
      if (dist > threshold) {
        allSim = false;
        break;
      }
    }
    if (allSim) { overlapLength = i; break; }
  }

  if (overlapLength === 0) {
    return { adjustedText1: text1, adjustedText2: text2, overlap: null };
  }

  const overlapWords = rawWords1.slice(-overlapLength);
  const overlap = overlapWords.join(' ');

  // Reconstruction des segments
  const adjustedText1 = rawWords1
    .slice(0, rawWords1.length - overlapLength)
    .concat(overlapWords)
    .join(' ')
    .trim();
  const adjustedText2 = rawWords2
    .slice(overlapLength)
    .join(' ')
    .trim();

  return { adjustedText1, adjustedText2, overlap };
}

// Helpers à intégrer dans le même fichier :
function normalizeWord(w) {
  return w.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '');
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