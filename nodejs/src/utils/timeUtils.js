// src/utils/timeUtils.js

// function convertSecondsToTime(seconds) {
//   const hours = Math.floor(seconds / 3600);
//   const minutes = Math.floor((seconds % 3600) / 60);
//   const secs = seconds % 60;

//   return `${hours.toString().padStart(2, "0")}:${minutes
//     .toString()
//     .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
// }
// function convertSecondsToTime(seconds) {
//   const h = Math.floor(seconds / 3600)
//     .toString()
//     .padStart(2, "0");
//   const m = Math.floor((seconds % 3600) / 60)
//     .toString()
//     .padStart(2, "0");
//   const s = (seconds % 60).toString().padStart(2, "0");
//   return `${h}:${m}:${s}`;
// }

function convertSecondsToTime(seconds) {
  if (typeof seconds !== "number" || isNaN(seconds)) {
    throw new Error(`Durée invalide : ${seconds}`);
  }

  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  const ms = Math.round((seconds % 1) * 1000)
    .toString()
    .padStart(3, "0");

  return `${h}:${m}:${s}.${ms}`;
}

// function convertTimeToSeconds(time) {
//   const [hours, minutes, seconds] = time.split(":").map(Number);
//   return hours * 3600 + minutes * 60 + seconds;
// }

function convertTimeToSeconds(time) {
  const [h, m, s] = time.split(":");
  const [sec, ms = 0] = s.split(".");
  return (
    parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(sec) + parseInt(ms) / 1000
  );
}

module.exports = { convertSecondsToTime, convertTimeToSeconds };
