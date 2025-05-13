const VideoSegmentModel = require("../models/VideoSegmentModel");
const SegmentUserModel = require("../models/SegmentUserModel");
// const io = require("../config/socket"); // WebSocket centralisé
const {
  convertSecondsToTime,
  convertTimeToSeconds,
} = require("../utils/timeUtils");
const { getAsync } = require("../redis/index");
const { getConnectedUsers } = require("../utils/socketUtils");
// Accès différé à `io`
// Pour éviter plusieurs setInterval() pour une même session
const activeSchedulers = new Map();
const roundRobinIndexes = new Map(); // sessionId → index de rotation
const segmentAssignments = new Map(); // sessionId → { userId → count }
// const io = require("../config/socket"); // WebSocket centralisé
/**
 * Génère un segment glissant pour une session donnée.
 */
async function generateSegment({
  sessionId,
  segmentDuration,
  step,
  users,
  socketUsers = new Map(),
}) {
  if (!users || users.length === 0) {
    console.log(
      `[Scheduler] Aucun utilisateur connecté pour la session ${sessionId}`
    );
    return;
  }

  const lastSegment = await VideoSegmentModel.getLastSegment(sessionId);
  const startTime = lastSegment
    ? convertTimeToSeconds(lastSegment.start_time) + step
    : 0;
  const endTime = startTime + segmentDuration;

  console.log("DEBUG:", { startTime, endTime });

  const userToAssign = selectBalancedUser(sessionId, users);
  if (!userToAssign) {
    console.log(
      `[Scheduler] Aucun utilisateur éligible trouvé pour session ${sessionId}`
    );
    return;
  }

  const segment = await VideoSegmentModel.insert({
    session_id: sessionId,
    start_time: convertSecondsToTime(startTime),
    end_time: convertSecondsToTime(endTime),
    status: "pending",
    created_at: new Date(),
  });

  await SegmentUserModel.insert({
    segment_id: segment.segment_id,
    user_id: userToAssign.id,
    assigned_at: new Date(),
  });
  console.log("Socket ID cible :", userToAssign.id);
  // ✅ Vérification défensive avant utilisation
  if (!socketUsers || typeof socketUsers.get !== "function") {
    console.warn(
      `[Scheduler] socketUsers invalide ou non transmis pour user ${userToAssign.id}`
    );

    return; // 🔴 Sortir pour éviter une exception
  }
  const socketId = userToAssign.socketId;

  // const socketId = await getAsync(`socket:${userToAssign.id}`);
  if (socketId) {
    const io = require("../config/socket");
    io.to(socketId).emit("segment-assigned", segment);
    console.log(
      `[WebSocket] Segment envoyé à socket ${socketId} (user ${userToAssign.id})`
    );
  } else {
    console.warn(
      `[WebSocket] Aucun socketId trouvé pour user ${userToAssign.id}`
    );
  }
}

/**
 *
 * @param {*} sessionId
 * @param {*} users
 * @returns
 */
function selectBalancedUser(sessionId, users) {
  if (!users || users.length === 0) return null;

  // Initialiser la map pour cette session si absente
  if (!segmentAssignments.has(sessionId)) {
    segmentAssignments.set(sessionId, new Map());
  }
  const sessionMap = segmentAssignments.get(sessionId);

  // Trier par count (pondération), puis appliquer une rotation douce
  const sorted = [...users].sort((a, b) => {
    const countA = sessionMap.get(a.id) || 0;
    const countB = sessionMap.get(b.id) || 0;
    return countA - countB;
  });

  // Round-robin équilibré entre ceux ayant le même count
  const currentIndex = roundRobinIndexes.get(sessionId) || 0;
  const filtered = sorted.filter(
    (u) => (sessionMap.get(u.id) || 0) === (sessionMap.get(sorted[0].id) || 0)
  );

  const selectedUser = filtered[currentIndex % filtered.length];

  // Mettre à jour l’index et le compteur
  roundRobinIndexes.set(sessionId, (currentIndex + 1) % filtered.length);
  sessionMap.set(selectedUser.id, (sessionMap.get(selectedUser.id) || 0) + 1);

  return selectedUser;
}

/**
 * Sélectionne le meilleur utilisateur pour l'assignation.
 */
function selectBestUser(users) {
  return users.sort((a, b) => {
    if (a.activeSegmentCount !== b.activeSegmentCount) {
      return a.activeSegmentCount - b.activeSegmentCount;
    }
    return new Date(a.lastActiveAt) - new Date(b.lastActiveAt);
  })[0];
}

/**
 * Lance le scheduler toutes les `step` secondes pour une session.
 * Protégé contre les doublons.
 */
// function startSegmentScheduler({ sessionId, segmentDuration, step, users }) {
//   if (activeSchedulers.has(sessionId)) {
//     console.log(`[Scheduler] Déjà actif pour session ${sessionId}`);
//     return;
//   }

//   console.log(`[Scheduler] Démarrage pour session ${sessionId}`);
//   const intervalId = setInterval(async () => {
//     const connectedUsers = await getConnectedUsers(sessionId);

//     const enrichedUsers = connectedUsers.map((user) => ({
//       id: user.user_id,
//       username: user.username,
//       activeSegmentCount: 0, // Tu peux l'améliorer ensuite
//       lastActiveAt: new Date(), // Idem : à raffiner
//     }));

//     await generateSegment({
//       sessionId,
//       segmentDuration,
//       step,
//       users: enrichedUsers,
//     });
//   }, step * 1000);

//   activeSchedulers.set(sessionId, intervalId);
// }

// function startSegmentScheduler({ sessionId, segmentDuration, step, io }) {
//   if (activeSchedulers.has(sessionId)) {
//     console.log(`[Scheduler] Déjà actif pour session ${sessionId}`);
//     return;
//   }

//   console.log(`[Scheduler] Démarrage pour session ${sessionId}`);

//   const intervalId = setInterval(async () => {
//     const roomSockets = await io.in(`session:${sessionId}`).allSockets();
//     const validUsers = [];

//     for (const socketId of roomSockets) {
//       const socket = io.sockets.sockets.get(socketId);
//       const user_id = socket?.data?.user_id;
//       const username = socket?.data?.username;

//       if (!user_id || !username) continue;

//       const redisSocketId = await getAsync(`socket:${user_id}`);

//       // On valide que le socket encore dans Redis correspond bien à celui connecté
//       if (redisSocketId === socketId) {
//         validUsers.push({
//           id: user_id,
//           username,
//         });
//       }
//     }

//     console.log(
//       `[Scheduler] Utilisateurs valides (connectés et synchronisés) :`,
//       validUsers.map((u) => `${u.id}:${u.username}`)
//     );

//     if (validUsers.length === 0) {
//       console.log(
//         `[Scheduler] Aucun utilisateur valide dans session ${sessionId}, skip.`
//       );
//       return;
//     }

//     await generateSegment({
//       sessionId,
//       segmentDuration,
//       step,
//       users: validUsers,
//     });
//   }, step * 1000);

//   activeSchedulers.set(sessionId, intervalId);
// }

async function startSegmentScheduler({
  sessionId,
  segmentDuration,
  step,
  io,
  socketUsers,
}) {
  if (activeSchedulers.has(sessionId)) {
    console.log(`[Scheduler] Déjà actif pour session ${sessionId}`);
    return;
  }
  console.log(`[Scheduler] Démarrage pour session ${sessionId}`);

  const intervalId = setInterval(async () => {
    // 🔥 Nouvelle logique : récupération directe des sockets connectées
    const sockets = await io.in(`session:${sessionId}`).fetchSockets();
    const validUsers = sockets
      .filter((sock) => sock.data.user_id && sock.data.username)
      .map((sock) => ({
        id: sock.data.user_id,
        username: sock.data.username.trim(),
        socketId: sock.id,
      }));

    console.log(
      `[Scheduler] Utilisateurs valides :`,
      validUsers.map((u) => `${u.id}:${u.username}`)
    );

    if (validUsers.length === 0) {
      console.log(`[Scheduler] Aucun utilisateur valide, skip.`);
      return;
    }
    await generateSegment({
      sessionId,
      segmentDuration,
      step,
      users: validUsers,
      socketUsers,
    });
  }, step * 1000);

  activeSchedulers.set(sessionId, intervalId);
}
/**
 * Arrête le scheduler en cours pour une session.
 */
function stopSegmentScheduler(sessionId) {
  const intervalId = activeSchedulers.get(sessionId);
  if (intervalId) {
    clearInterval(intervalId);
    activeSchedulers.delete(sessionId);
    console.log(`[Scheduler] Arrêté pour session ${sessionId}`);
  }
}

module.exports = {
  generateSegment,
  startSegmentScheduler,
  stopSegmentScheduler,
};
