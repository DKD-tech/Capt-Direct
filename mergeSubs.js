const fs = require('fs');
const path = require('path');
const levenshtein = require('fast-levenshtein');

function findBestVersion(versions) {
    const n = versions.length;
    const scores = new Array(n).fill(0);

    // Compare chaque version avec les autres
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i !== j) {
                scores[i] += levenshtein.get(versions[i], versions[j]);
            }
        }
    }

    // Trouver la version avec le score le plus faible
    let bestIndex = 0;
    let minScore = scores[0];
    for (let i = 1; i < n; i++) {
        if (scores[i] < minScore) {
            minScore = scores[i];
            bestIndex = i;
        }
    }

    return versions[bestIndex];
}

function processFiles(input, folderPath, outputFilePath) {
    try {
        // Lire le contenu du dossier
        const files = fs.readdirSync(folderPath);

        // Filtrer les fichiers qui commencent par la chaîne donnée
        const filteredFiles = files.filter(file => file.startsWith(input));

        // Lire le contenu de chaque fichier filtré
        const versions = filteredFiles.map(file => {
            const filePath = path.join(folderPath, file);
            return fs.readFileSync(filePath, 'utf-8');
        });

        if (versions.length === 0) {
            console.error("Aucun fichier trouvé correspondant à la chaîne donnée.");
            return;
        }

        // Trouver la meilleure version
        const bestVersion = findBestVersion(versions);

        // Écrire la meilleure version dans un fichier de sortie
        fs.writeFileSync(outputFilePath, bestVersion, 'utf-8');
        console.log(`Meilleure version écrite dans le fichier : ${outputFilePath}`);
    } catch (error) {
        console.error("Erreur lors du traitement des fichiers :", error);
    }
}

const prefix = process.argv[2];

console.log(prefix);

const folderPath = "./files"; // Remplacez par le chemin du dossier
const outputFilePath = "./final/"+ prefix +"final.txt"; // Remplacez par le chemin du fichier de sortie

processFiles(prefix, folderPath, outputFilePath);
