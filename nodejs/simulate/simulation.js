// const { io } = require("socket.io-client");
// const axios = require("axios");

// const SERVER_URL = "http://192.168.234.212:3000";
// const SESSION_ID = 29;

// const USERS = [
//   { id: 31, username: "User1" },
//   { id: 32, username: "User2" },
//   { id: 33, username: "User3" },
//   { id: 34, username: "User4" },
//   { id: 35, username: "User5" },
//   { id: 36, username: "User6" },
//   { id: 37, username: "User7" },
//   { id: 38, username: "User8" },
//   { id: 39, username: "User9" },
//   { id: 40, username: "User10" },
// ];

// const TEXTS = [
//   "Bonjour, je suis prêt.",
//   "Je commence à taper.",
//   "Voici ma contribution.",
//   "Ceci est une phrase test.",
//   "Je participe à la session.",
//   "Un autre segment ici.",
//   "Le sous-titre s’enregistre.",
//   "J'écris rapidement.",
//   "Presque terminé.",
//   "Dernier test utilisateur.",
// ];

// let socketsReady = 0;

// function simulateUser(user, index, onReady) {
//   const { id: userId, username } = user;
//   const socket = io(SERVER_URL, { transports: ["websocket"] });

//   socket.on("connect", () => {
//     console.log(`🟢 [${username}] connecté (socket id: ${socket.id})`);

//     socket.emit("join-session", {
//       session_id: SESSION_ID,
//       user_id: userId,
//       username: username,
//     });

//     socketsReady++;
//     if (socketsReady === USERS.length) {
//       onReady(); // tous les sockets sont prêts
//     }
//   });

//   socket.on("segment-assigned", (segment) => {
//     console.log(`📦 [${username}] segment assigné: ${segment.segment_id}`);
//     const delay = Math.max(segment.start_unix - Date.now(), 0);

//     setTimeout(async () => {
//       const subtitleText = TEXTS[index % TEXTS.length];

//       try {
//         const response = await axios.post(
//           `${SERVER_URL}/api/sessions/add-subtitle`,
//           {
//             segment_id: segment.segment_id,
//             text: subtitleText,
//             created_by: userId,
//           }
//         );

//         console.log(`📝 [${username}] Sous-titre ajouté : "${subtitleText}"`);
//         console.log("✅ Réponse API :", response.data);
//       } catch (error) {
//         console.error(
//           `❌ [${username}] Erreur API add-subtitle :`,
//           error.message
//         );
//       }

//       // Déconnexion après envoi
//       setTimeout(() => {
//         socket.emit("leaveVideoSession", { userId, sessionId: SESSION_ID });
//         socket.disconnect();
//         console.log(`🔴 [${username}] déconnecté.`);
//       }, 2000);
//     }, delay);
//   });
// }

// async function startSession() {
//   console.log("🚀 Démarrage de la session...");
//   try {
//     await axios.post(
//       `${SERVER_URL}/api/sessions/start-segmentation/${SESSION_ID}`
//     );
//     console.log("✅ Segmentation lancée.");
//   } catch (error) {
//     console.error(
//       "❌ Erreur lancement session:",
//       error.response?.data || error.message
//     );
//   }
// }

// async function stopSession() {
//   console.log("🛑 Arrêt de la session...");
//   try {
//     await axios.post(
//       `${SERVER_URL}/api/sessions/stop-segmentation/${SESSION_ID}`
//     );
//     console.log("✅ Session stoppée.");
//   } catch (error) {
//     console.error(
//       "❌ Erreur arrêt session:",
//       error.response?.data || error.message
//     );
//   }
// }

// (async () => {
//   console.log("🧪 Connexion des utilisateurs...");
//   USERS.forEach((user, i) =>
//     simulateUser(user, i, async () => {
//       if (socketsReady === USERS.length) {
//         setTimeout(async () => {
//           await startSession();
//           setTimeout(() => stopSession(), 65000);
//         }, 2000);
//       }
//     })
//   );
// })();

const { io } = require("socket.io-client");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const SERVER_URL = "http://192.168.196.212:3000";
const SESSION_ID = 88;

const USERS = [
  { id: 31, username: "User1" },
  { id: 32, username: "User2" },
  { id: 33, username: "User3" },
  { id: 34, username: "User4" },
  { id: 35, username: "User5" },
  { id: 36, username: "User6" },
  { id: 37, username: "User7" },
  { id: 38, username: "User8" },
  { id: 39, username: "User9" },
  { id: 40, username: "User10" },
];

const TEXTS = [
  "Aujourd’hui, nous abordons la réforme de l'énergie nucléaire.",
  "Nous abordons la réforme de l'énergie nucléaire. Le ministre interviendra à ce sujet.",
  "Le ministre interviendra à ce sujet. Il évoquera aussi les énergies renouvelables.",
  "Il évoquera aussi les énergies renouvelables, notamment le solaire et l’éolien.",
  "Notamment le solaire et l’éolien, qui jouent un rôle crucial dans la transition.",
  "Qui jouent un rôle crucial dans la transition énergétique selon les experts.",
  "Selon les experts, une réduction de 40 % des émissions est envisageable.",
  "Une réduction de 40 % des émissions est envisageable d’ici 2035.",
  "D’ici 2035, le gouvernement veut atteindre la neutralité carbone.",
  "Le gouvernement veut atteindre la neutralité carbone avec des efforts collectifs.",
  "Avec des efforts collectifs, chaque citoyen peut contribuer au changement.",
  "Chaque citoyen peut contribuer au changement par des gestes simples.",
  "Par des gestes simples comme éteindre les lumières ou mieux isoler son logement.",
  "Comme éteindre les lumières ou mieux isoler son logement pour réduire la consommation.",
  "Pour réduire la consommation, des aides financières seront proposées.",
  "Des aides financières seront proposées pour accompagner les foyers modestes.",
  "Pour accompagner les foyers modestes, des subventions seront renforcées.",
  "Des subventions seront renforcées dès l’année prochaine, promet le ministre.",
  "Dès l’année prochaine, promet le ministre, un plan ambitieux sera lancé.",
  "Un plan ambitieux sera lancé, impliquant tous les acteurs du secteur.",
];

const TEXT_QUEUE = [...TEXTS];

let socketsReady = 0;
let sockets = [];

function simulateUser(user, index, onReady) {
  const { id: userId, username } = user;
  const socket = io(SERVER_URL, { transports: ["websocket"] });
  let segmentCount = 0;
  sockets.push({ socket, userId, username });

  socket.on("connect", () => {
    console.log(`🟢 [${username}] connecté (socket id: ${socket.id})`);
    socket.emit("join-session", {
      session_id: SESSION_ID,
      user_id: userId,
      username: username,
    });

    socketsReady++;
    if (socketsReady === USERS.length) {
      onReady();
    }
  });

  socket.on("segment-assigned", async (segment) => {
    segmentCount++;
    console.log(`📦 [${username}] segment assigné: ${segment.segment_id}`);

    const delay = Math.max(segment.start_unix - Date.now(), 0);
    setTimeout(async () => {
      const text =
        TEXT_QUEUE.length > 0
          ? TEXT_QUEUE.shift()
          : `Texte par défaut pour segment ${segment.segment_id}`;

      const payload = {
        segment_id: segment.segment_id,
        text,
        created_by: userId,
      };

      try {
        const res = await axios.post(
          `${SERVER_URL}/api/sessions/add-subtitle`,
          payload
        );
        console.log(`📝 [${username}] Sous-titre ajouté : "${text}"`);
        console.log("✅ Réponse API :", res.data);
      } catch (error) {
        console.error(
          `❌ [${username}] Erreur envoi sous-titre :`,
          error.response?.data || error.message
        );
      }
    }, delay);
  });
}

async function startSession() {
  console.log("🚀 Démarrage de la session...");
  try {
    await axios.post(
      `${SERVER_URL}/api/sessions/start-segmentation/${SESSION_ID}`
    );
    console.log("✅ Segmentation lancée.");
  } catch (error) {
    console.error(
      "❌ Erreur lancement session:",
      error.response?.data || error.message
    );
  }
}

async function generateAndDownloadSRT() {
  try {
    const response = await axios.get(
      `${SERVER_URL}/api/sessions/export-srt/${SESSION_ID}`,
      { responseType: "arraybuffer" }
    );

    const outputPath = path.join(__dirname, `session-${SESSION_ID}.srt`);
    fs.writeFileSync(outputPath, response.data);
    console.log(`📄 Fichier SRT sauvegardé : ${outputPath}`);
  } catch (error) {
    console.error("❌ Erreur lors de l'export SRT :", error.message);
  }
}

async function stopSessionAndDisconnect() {
  console.log("🛑 Arrêt de la session...");
  try {
    await axios.post(
      `${SERVER_URL}/api/sessions/stop-segmentation/${SESSION_ID}`
    );
    console.log("✅ Session stoppée.");
  } catch (error) {
    console.error(
      "❌ Erreur arrêt session:",
      error.response?.data || error.message
    );
  }

  await generateAndDownloadSRT();

  sockets.forEach(({ socket, userId, username }) => {
    socket.emit("leaveVideoSession", { userId, sessionId: SESSION_ID });
    socket.disconnect();
    console.log(`🔴 [${username}] déconnecté.`);
  });
}

(async () => {
  console.log("🧪 Connexion des utilisateurs...");
  USERS.forEach((user, i) =>
    simulateUser(user, i, async () => {
      if (socketsReady === USERS.length) {
        setTimeout(async () => {
          await startSession();
          setTimeout(() => stopSessionAndDisconnect(), 70000);
        }, 2000);
      }
    })
  );
})();
