// segmentScheduler.js

const VideoSegmentModel = require("../models/VideoSegmentModel");
const SegmentUserModel  = require("../models/SegmentUserModel");
const {
  convertSecondsToTime,
  convertTimeToSeconds,
} = require("../utils/timeUtils");
const { getAsync } = require("../redis/index");
const { getConnectedUsers } = require("../utils/socketUtils");

// Pour éviter plusieurs setInterval() pour une même session
const activeSchedulers   = new Map();
const roundRobinIndexes  = new Map(); // sessionId → index de rotation
const segmentAssignments = new Map(); // sessionId → { userId → count }

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

  // 1) Récupérer le dernier segment pour calculer startTime/endTime
  const lastSegment = await VideoSegmentModel.getLastSegment(sessionId);
  const startTime = lastSegment
    ? convertTimeToSeconds(lastSegment.start_time) + step
    : 0;
  const endTime = startTime + segmentDuration;

  console.log("DEBUG:", { startTime, endTime });

  // 2) Sélectionner l’utilisateur selon round-robin
  const userToAssign = selectBalancedUser(sessionId, users);
  if (!userToAssign) {
    console.log(
      `[Scheduler] Aucun utilisateur éligible trouvé pour session ${sessionId}`
    );
    return;
  }

  // 3) Calculer le timestamp absolu (ms) de début du segment
  const startUnix = Date.now() + step * 1000;

  // 4) Insérer le segment en status "in_progress"
  const segment = await VideoSegmentModel.insert({
    session_id: sessionId,
    start_time: convertSecondsToTime(startTime),
    end_time:   convertSecondsToTime(endTime),
    status:     "in_progress", // on marque directement en in_progress
    created_at: new Date(),
  });

  // 5) Assigner cet utilisateur au segment
  await SegmentUserModel.insert({
    segment_id:  segment.segment_id,
    user_id:     userToAssign.id,
    assigned_at: new Date(),
  });

  console.log("Socket ID cible :", userToAssign.socketId);

  // 6) Vérification défensive de socketUsers
  if (!socketUsers || typeof socketUsers.get !== "function") {
    console.warn(
      `[Scheduler] socketUsers invalide ou non transmis pour user ${userToAssign.id}`
    );
    return;
  }
  const socketId = userToAssign.socketId;

  if (socketId) {
    // → IMPORT DYNAMIQUE corrigé :
    const socketModule = await import("../config/socket.js");
    // si votre config/socket.js faisait un "export default io"
    // alors socketModule.default contient l’objet io
    // si au contraire il faisait "export const io = new Server(...)"
    // alors socketModule.io contient l’objet io
    const io = socketModule.io || socketModule.default;

    if (!io) {
      console.error(
        "[Scheduler] Impossible de récupérer `io` depuis config/socket.js"
      );
      return;
    }

    io.to(socketId).emit("segment-assigned", {
      segment_id:  segment.segment_id,
      session_id:  segment.session_id,
      start_time:  segment.start_time,
      end_time:    segment.end_time,
      status:      segment.status,      // “in_progress”
      assigned_to: userToAssign.username,
      start_unix:  startUnix             // timestamp absolu (ms)
    });

    console.log(
      `[WebSocket] "segment-assigned" émis à socket ${socketId} (user ${userToAssign.id})`
    );
  } else {
    console.warn(
      `[WebSocket] Aucun socketId trouvé pour user ${userToAssign.id}`
    );
  }
}

/**
 * Sélectionne l’utilisateur suivant (round-robin pondéré).
 */
function selectBalancedUser(sessionId, users) {
  if (!users || users.length === 0) return null;
  if (!segmentAssignments.has(sessionId)) {
    segmentAssignments.set(sessionId, new Map());
  }
  const sessionMap = segmentAssignments.get(sessionId);

  // 1) Trier par “count” (moindre d’abord)
  const sorted = [...users].sort((a, b) => {
    const countA = sessionMap.get(a.id) || 0;
    const countB = sessionMap.get(b.id) || 0;
    return countA - countB;
  });

  // 2) Round-robin parmi ceux qui ont le même count minimal
  const currentIndex = roundRobinIndexes.get(sessionId) || 0;
  const minCount = sessionMap.get(sorted[0].id) || 0;
  const filtered = sorted.filter(
    (u) => (sessionMap.get(u.id) || 0) === minCount
  );

  const selectedUser = filtered[currentIndex % filtered.length];

  // 3) Incrémenter l’index et mettre à jour le count
  roundRobinIndexes.set(sessionId, (currentIndex + 1) % filtered.length);
  sessionMap.set(
    selectedUser.id,
    (sessionMap.get(selectedUser.id) || 0) + 1
  );

  return selectedUser;
}

/**
 * Lance le scheduler toutes les `step` secondes pour une session.
 * Protégé contre les doublons.
 */
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

  // 1) Génération immédiate du premier segment (au temps T0)
  //    pour que le client reçoive la notification « C'est bientôt à vous » dès
  //    que possible, sans attendre `step` secondes.
   const sockets0 = await io.in(`session:${sessionId}`).fetchSockets();
   const validUsers0 = sockets0
   .filter((sock) => sock.data.user_id && sock.data.username)
   .map((sock) => ({
     id: sock.data.user_id,
     username: sock.data.username.trim(),
     socketId: sock.id,
   }));
     if (validUsers0.length > 0) {
     await generateSegment({
      sessionId,
     segmentDuration,
     step,
     users: validUsers0,
     socketUsers,
   });
 }


  const intervalId = setInterval(async () => {
    // Récupérer la liste des sockets dans la room `session:${sessionId}`
    const sockets = await io.in(`session:${sessionId}`).fetchSockets();
    const validUsers = sockets
      .filter((sock) => sock.data.user_id && sock.data.username)
      .map((sock) => ({
        id:       sock.data.user_id,
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
      socketUsers
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
