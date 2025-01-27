const fs = require("fs");
const path = require("path");

// Dossier contenant vos fichiers TXT
const DICTIONARY_DIR = path.join(__dirname, "../../dictionnaires");

function loadDictionary() {
  const files = fs.readdirSync(DICTIONARY_DIR);
  const words = new Set();

  files.forEach((file) => {
    const filePath = path.join(DICTIONARY_DIR, file);
    console.log(`Chargement du fichier : ${filePath}`);

    const lines = fs.readFileSync(filePath, "utf-8").split("\n");
    let startReading = false;

    lines.forEach((line) => {
      const trimmedLine = line.trim();

      if (trimmedLine.includes("FIN DE LA LICENCE ABU")) {
        startReading = true;
        return;
      }

      if (!startReading || !trimmedLine) return;

      const word = trimmedLine.split("\t")[0];

      if (/^[a-zàâçéèêëîïôûùüÿñæœ'-]+$/i.test(word)) {
        words.add(word.toLowerCase());
      }
    });
  });

  console.log(`Dictionnaire chargé avec ${words.size} mots.`);
  return words;
}

// Charger le dictionnaire une seule fois
const DICTIONNAIRE = loadDictionary();

module.exports = {
  DICTIONNAIRE,
};
