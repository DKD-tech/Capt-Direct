const levenshtein = require('fast-levenshtein');

class Merge {
	constructor(deltaMax) {
	    this.tabSize = 1000; // Taille du tableau
	    this.mInputs = new Array(); // Tableau de MergeInput
	    this.mOutputs = new Array(); // Tableau de résultats
	    this.deltaMax = deltaMax; // Ecart maximal en secondes entre deux comparaisons
	    this.infinity = 9999999;
	    this.separateurs = [',', ';', '-', '?', '!', '|'];
	}

	/*#inRange(startI, timeI, startRef, timeRef){
		if(startI + timeI + this.deltaMax < startRef){
			return false;
		}
		if(startRef + timeRef + this.deltaMax < startI){
			return false;
		}
		return true;
	}*/

	#inRange(startI, startRef){
		if(startI + this.deltaMax < startRef){
			return false;
		}
		if(startRef + this.deltaMax < startI){
			return false;
		}
		return true;
	}

	#findBestVersion(mInputs, start, time) {
    const n = mInputs.length;
    const scores = new Array(n).fill(0);

    // Compare chaque version avec les autres
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
      	//if(this.#inRange(this.mInputs[j].start, this.mInputs[j].time, this.mInputs[i].start, this.mInputs[i].time)){
      	if(this.#inRange(this.mInputs[j].start, this.mInputs[i].start)){
      		//console.log("compare " + mInputs[i].text + " with " + mInputs[j].text + " : " + levenshtein.get(mInputs[i].text, mInputs[j].text));
          if (i !== j) {
            scores[i] += levenshtein.get(mInputs[i].text, mInputs[j].text);
          }
        }
      }
    }

    // Trouver la version avec le score le plus faible
    let minScore = this.infinity;
    let bestIndex = -1;
    for (let i = 1; i < n; i++) {
    	if(this.#inRange(this.mInputs[i].start, start)){
    		  //console.log(mInputs[i].text + ", score : " + scores[i]);
	        if (scores[i] < minScore) {
	            minScore = scores[i];
	            bestIndex = i;
	        }
	    }
    }
    if(bestIndex === -1){
    	return null;
    }

    return new MergeOutput(start, time, mInputs[bestIndex].text);
	}

	#gererSeparateur(writer, start, time, text) {
    let chaines = [];
    let temp = "";
    let nbSeparateurs = 0;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (this.separateurs.includes(char)) {
            if (temp !== "") {
            		nbSeparateurs++;
            	  chaines.push(temp);
                temp = "";
            }
        } else {
            temp += char;
        }
    }

    // Ajouter la dernière sous-chaîne si elle n'est pas vide
    if (temp !== "") {
    		chaines.push(temp); 
    }

    let relativeTime = parseInt(time / (nbSeparateurs + 1), 10);

    for(let i = 0; i < chaines.length; i++){
    	const relativeStart = start + (i*relativeTime);
    	this.mInputs.push(new MergeInput(writer, relativeStart, relativeStart + relativeTime, relativeTime, this.mInputs.length, chaines[i]));
    }
	}

  	// Méthode pour ajouter un texte
  	// Renvoie true si ajout, false sinon (texte sans lettre ni chiffre)
  	addText(writer, start, time, text) {
	    // Si le texte ne contient ni lettre ni chiffre
	    if (/^[^a-zA-Z0-9]*$/.test(text)){
	    	return false;
	    }
	    // Ajoute un nouvel objet MergeInput au tableau mInputs

	    this.#gererSeparateur(writer, start, time, text);
	    /*const newInput = new MergeInput(writer, start, start + time, time, this.mInputs.length, text);
	    this.mInputs.push(newInput);*/
	    return true;
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
	merge = new Merge(3);

	merge.addText(0, 0, 8, "deujour");
	merge.addText(1, 1, 10, "bonjain");
	merge.addText(2, 2, 12, "bonjour");
	merge.addText(0, 10, 7, "giyevoir");
	merge.addText(1, 11, 9, "aurevoir");
	merge.addText(2, 12, 11, "aurevukd");
	merge.addText(3, 9, 12, "/^¨()&");
	merge.addText(0, 20, 7, "bonjour, kudevoir");
	merge.addText(1, 21, 9, "filjour | aurevilm");
	merge.addText(2, 19, 11, "bonjegl ; aurevoir");
	
	console.log(merge);
	console.log(merge.getResult(0, 10).text);
	console.log(merge.getResult(10, 10).text);
	console.log(merge.getResult(20, 5).text);
	console.log(merge.getResult(25, 5).text);
}

//mergeTest();
