const axios = require;
const SubtitleModel = require("../models/SubtitleModel"); // Ajuste le chemin si nécessaire
const VideoSegmentModel = require("../models/VideoSegmentModel"); // Pour accéder aux segments voisins
const { verifierTexte } = require("../utils/correction");

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

module.exports = {
  adjustTextWithNeighbors,
  handleOverlapWithWords,
};
