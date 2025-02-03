const { client: redisClient } = require("../redis/index");

const VideoSegmentModel = require("../models/VideoSegmentModel");
const SubtitleModel = require("../models/SubtitleModel");

/**
 * 🔹 Ajuste le texte en fonction du segment précédent et suivant pour éviter les chevauchements.
 */
async function adjustTextWithNeighbors(currentSegment, text) {
    console.log(`🛠️ Ajustement du texte pour le segment ${currentSegment.segment_id}`);

    // ✅ Trouver le segment précédent via la base de données
    const previousSegment = await VideoSegmentModel.getPreviousSegment(currentSegment.segment_id);
    if (previousSegment) {
        const lastWordPrevSegment = await redisClient.get(`lastWord:${previousSegment.segment_id}`);

        if (lastWordPrevSegment) {
            const { adjustedText, overlap } = handleOverlapWithWords(lastWordPrevSegment, text);
            if (overlap) {
                console.log(`🔄 Ajustement avec le segment précédent (${previousSegment.segment_id}) : "${overlap}"`);
                text = adjustedText; // Correction du texte actuel
            }
            await redisClient.del(`lastWord:${previousSegment.segment_id}`); // Suppression du cache après fusion
        }
    }

    // ✅ Vérifier si un segment suivant existe
    const nextSegment = await VideoSegmentModel.getNextSegment(currentSegment.segment_id);
    if (nextSegment) {
        const nextSubtitles = await SubtitleModel.getSubtitlesBySegment(nextSegment.segment_id);
        for (let subtitle of nextSubtitles) {
            const { adjustedText, overlap } = handleOverlapWithWords(text, subtitle.text);
            if (overlap) {
                console.log(`🔄 Ajustement avec le segment suivant (${nextSegment.segment_id}) : "${overlap}"`);
                text = adjustedText;
            }
        }
    }

    console.log(`✅ Texte final ajusté : "${text}"`);
    return text;
}

/**
 * 🔍 Vérifie et ajuste le chevauchement entre deux segments.
 */
function handleOverlapWithWords(previousText, currentText) {
    const previousWords = previousText.trim().split(" ");
    const currentWords = currentText.trim().split(" ");
    let overlap = "";

    // 🔎 Détection du chevauchement
    for (let i = 1; i <= Math.min(previousWords.length, currentWords.length); i++) {
        const lastWordsPrev = previousWords.slice(-i).join(" ");
        const firstWordsCurrent = currentWords.slice(0, i).join(" ");

        if (lastWordsPrev === firstWordsCurrent) {
            overlap = lastWordsPrev; // Chevauchement détecté
        }
    }

    if (overlap) {
        console.warn(`⚠️ Chevauchement détecté : "${overlap}"`);
        const adjustedText = currentWords.slice(overlap.split(" ").length).join(" ").trim();
        return { adjustedText, overlap };
    }

    return { adjustedText: currentText, overlap: null };
}

/**
 * 🔹 Stocke temporairement le dernier mot d'un segment finalisé dans Redis.
 */
async function storeLastWordInRedis(segment) {
    const words = segment.text.trim().split(" ");
    if (words.length > 0) {
        const lastWord = words[words.length - 1];

        // 🔹 On stocke le dernier mot par **session** pour que les prochains segments puissent y accéder
        await redisClient.setex(`lastWord:${segment.session_id}`, 600, lastWord);

        console.log(`✅ Dernier mot du segment ${segment.segment_id} stocké en Redis pour la session ${segment.session_id} : "${lastWord}"`);
    }
}

module.exports = {
    adjustTextWithNeighbors,
    handleOverlapWithWords,
    storeLastWordInRedis,
};
