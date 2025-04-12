// Fonction utilitaire pour convertir "HH:mm:ss" en secondes
function convertTimeToSeconds(time) {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

// Implémentation de Merge Sort
function mergeSortSegments(segments) {
  if (segments.length <= 1) return segments;

  const middleIndex = Math.floor(segments.length / 2);
  const left = mergeSortSegments(segments.slice(0, middleIndex));
  const right = mergeSortSegments(segments.slice(middleIndex));

  return merge(left, right);
}

// Fonction pour fusionner deux tableaux triés
function merge(left, right) {
  const result = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (
      convertTimeToSeconds(left[leftIndex].start_time) <=
      convertTimeToSeconds(right[rightIndex].start_time)
    ) {
      result.push(left[leftIndex]);
      leftIndex++;
    } else {
      result.push(right[rightIndex]);
      rightIndex++;
    }
  }

  // Ajouter les éléments restants
  return result.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
}

module.exports = { mergeSortSegments };
