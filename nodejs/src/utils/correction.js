// const fs = require("fs");

// // Charger le JSON contenant le texte source
// const jsonData = JSON.parse(fs.readFileSync("../../data/nlp.json", "utf8"));

// // Extraire le texte et le convertir en minuscule pour uniformiser
// const texte = jsonData.contenu.join(" ").toLowerCase();

// // Fonction pour générer des n-grams (bigrammes ou trigrammes)
// function generateNGrams(words, n) {
//   let ngrams = {};
//   for (let i = 0; i <= words.length - n; i++) {
//     let gram = words.slice(i, i + n).join(" ");
//     ngrams[gram] = (ngrams[gram] || 0) + 1; // Compter les occurrences
//   }
//   return ngrams;
// }

// // Transformer le texte en tableau de mots
// const words = texte.split(/\s+/);

// // Générer les bigrammes et trigrammes
// const bigrams = generateNGrams(words, 2);
// const trigrams = generateNGrams(words, 3);

// // Sauvegarder les modèles n-grams dans des fichiers JSON
// fs.writeFileSync("bigrams.json", JSON.stringify(bigrams, null, 2));
// fs.writeFileSync("trigrams.json", JSON.stringify(trigrams, null, 2));

// // Charger le modèle trigramme
// const trigramModel = JSON.parse(fs.readFileSync("trigrams.json", "utf8"));

// // Fonction pour prédire le mot suivant
// function predictNextWord(segment, ngramModel) {
//   let words = segment.toLowerCase().split(/\s+/);
//   let lastWords = words.slice(-2).join(" "); // Prendre les 2 derniers mots pour chercher un trigramme

//   let predictions = Object.keys(ngramModel).filter((gram) =>
//     gram.startsWith(lastWords)
//   );

//   if (predictions.length > 0) {
//     return predictions[0].split(" ").slice(-1)[0]; // Retourne le mot le plus probable
//   }
//   return null; // Aucune prédiction trouvée
// }

// // Exporter les fonctions
// module.exports = {
//   predictNextWord,
//   trigramModel,
// };
