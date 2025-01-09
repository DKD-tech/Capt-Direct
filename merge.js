const levenshtein = require('fast-levenshtein');

class Merge {
  constructor(deltaMax) {
    this.tabSize = 1000; // Taille du tableau
    this.mInputs = new Array(); // Tableau de MergeInput
    this.mOutputs = new Array(); // Tableau de résultats
    this.deltaMax = deltaMax; // Initialisation de deltaMax
    this.infini = 9999999;
  }

  	#findBestVersion(mInputs, start, time) {
	    const n = mInputs.length;
	    const scores = new Array(n).fill(0);

	    // Compare chaque version avec les autres
	    for (let i = 0; i < n; i++) {
	    	if(mInputs[i].start === start){
		        for (let j = 0; j < n; j++) {
		        	if(mInputs[j].start === start){
			            if (i !== j) {
			                scores[i] += levenshtein.get(mInputs[i].text, mInputs[j].text);
			            }
			        }
		        }
		    }
	    }

	    // Trouver la version avec le score le plus faible
	    let minScore = -1;
	    let bestIndex = -1;
	    for (let i = 1; i < n; i++) {
	    	if(mInputs[i].start === start){
	            minScore = scores[i];
	            bestIndex = i;
		    }
	    }
	    if(bestIndex === -1){
	    	return null;
	    }
	    for (let i = 1; i < n; i++) {
	    	if(mInputs[i].start === start){
		        if (scores[i] < minScore) {
		            minScore = scores[i];
		            bestIndex = i;
		        }
		    }
	    }

	    return new MergeOutput(start, time, mInputs[bestIndex].text);
	}

  // Méthode pour ajouter un texte
  addText(writer, start, time, text) {
    // Ajoute un nouvel objet MergeInput au tableau mInputs
    const newInput = new MergeInput(writer, start, start + time, time, this.mInputs.length, text);
    this.mInputs.push(newInput);
  }

  // Méthode pour obtenir un résultat
  // return MergeOutput 
  getResult(start, time) {
    // Extrait les résultats en fonction du "start" et "time"
    if(this.mOutputs[start] !== undefined){
    	return this.mOutputs[start];
    }

    //Algo de distance etc.
    const mOutput = this.#findBestVersion(this.mInputs, start, time);
    this.mOutputs.slice(start, 0, mOutput);
    return mOutput;
  }
}

class MergeInput {
  constructor(writer, start, stop, time, index, text) {
    this.writer = writer; // Identifiant de l'écrivain
    this.start = start; // Temps de début
    this.stop = stop; // Temps de fin
    this.time = time; // Durée
    this.index = index; // Index dans le tableau
    this.text = text; // Texte associé
    this.distanceTab = new Array(); // Tableau de distances
  }
}

class MergeOutput {
  constructor(start, time, text) {
    this.start = start; // Temps de début
    this.time = time; // Durée
    this.text = text; // Texte associé

  }
}

//fonction de test
function mergeTest(){
	merge = new Merge(10);

	merge.addText(0, 0, 10, "deujour");
	merge.addText(1, 0, 10, "bonjain");
	merge.addText(2, 0, 10, "bonjour");
	merge.addText(0, 10, 10, "aiyevoire");
	merge.addText(1, 10, 10, "aurevoir");
	merge.addText(2, 10, 10, "aurevukd");

	console.log(merge.getResult(0, 10).text);
	console.log(merge.getResult(10, 10).text);
}

//mergeTest();
