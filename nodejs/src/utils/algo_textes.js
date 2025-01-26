const SubtitleModel = require("../models/SubtitleModel"); // Ajuste le chemin si nécessaire
const VideoSegmentModel = require("../models/VideoSegmentModel"); // Pour accéder aux segments voisins

function handleOverlap(text1, text2) {
  // Vérifie si un chevauchement existe
  const overlap = detectOverlap(text1, text2);

  if (overlap) {
    console.log(`Chevauchement détecté : "${overlap}"`);
    // Retourne les textes ajustés : coupe l'overlap du début ou de la fin
    const adjustedText1 = text1.slice(0, -overlap.length).trim();
    const adjustedText2 = text2.slice(overlap.length).trim();

    return { adjustedText1, adjustedText2 };
  }

  return { adjustedText1: text1, adjustedText2: text2 };
}

async function adjustTextWithNeighbors(currentSegment, text) {
  const previousSegment = await VideoSegmentModel.getPreviousSegment(
    currentSegment.segment_id
  );
  const nextSegment = await VideoSegmentModel.getNextSegment(
    currentSegment.segment_id
  );
  console.log(
    `Ajustement pour le segment ${currentSegment.segment_id}. Texte initial : "${text}"`
  );

  // Ajustement pour le segment précédent
  if (previousSegment) {
    const previousSubtitles = await SubtitleModel.getSubtitlesBySegment(
      previousSegment.segment_id
    );

    for (let subtitle of previousSubtitles) {
      const { adjustedText1, adjustedText2 } = handleOverlap(
        subtitle.text,
        text
      );
      text = adjustedText2; // Ajuster le texte courant
    }
  }

  // Ajustement pour le segment suivant
  if (nextSegment) {
    const nextSubtitles = await SubtitleModel.getSubtitlesBySegment(
      nextSegment.segment_id
    );

    for (let subtitle of nextSubtitles) {
      const { adjustedText1, adjustedText2 } = handleOverlap(
        text,
        subtitle.text
      );
      text = adjustedText1; // Ajuster le texte courant
    }
  }

  return text;
}
function detectOverlap(text1, text2) {
  const minLength = Math.min(text1.length, text2.length);
  for (let i = 1; i <= minLength; i++) {
    if (text1.slice(-i) === text2.slice(0, i)) {
      return text1.slice(-i); // Retourner la partie qui se chevauche
    }
  }
  return null; // Aucun chevauchement détecté
}

module.exports = {
  detectOverlap, // Assure-toi que detectOverlap est bien exportée
  handleOverlap,
  adjustTextWithNeighbors,
};
