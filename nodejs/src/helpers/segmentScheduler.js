const VideoSegmentModel = require("../models/VideoSegmentModel");
const SegmentUserModel  = require("../models/SegmentUserModel");
const {
  convertSecondsToTime,
  convertTimeToSeconds,
} = require("../utils/timeUtils");

// On garde les maps pour gérer le round-robin et éviter les duplications de setInterval
const activeSchedulers   = new Map();
const roundRobinIndexes  = new Map(); // sessionId → index de rotation
const segmentAssignments = new Map(); // sessionId → Map<userId, count>


/**
 * Extrait round-robin : choisi le user qui a eu le moins de segments jusqu'ici.
 */
function selectBalancedUser(sessionId, users) {
  if (!users || users.length === 0) return null;
  if (!segmentAssignments.has(sessionId)) {
    segmentAssignments.set(sessionId, new Map());
  }
  const sessionMap = segmentAssignments.get(sessionId);

  // 1) Tri par “count” (le moins servi d'abord)
  const sorted = [...users].sort((a, b) => {
    const countA = sessionMap.get(a.id) || 0;
    const countB = sessionMap.get(b.id) || 0;
    return countA - countB;
  });

  // 2) Round-robin parmi ceux au même compte minimal
  const currentIndex = roundRobinIndexes.get(sessionId) || 0;
  const minCount = sessionMap.get(sorted[0].id) || 0;
  const filtered = sorted.filter(u => (sessionMap.get(u.id) || 0) === minCount);

  const selectedUser = filtered[currentIndex % filtered.length];

  // 3) Incrémenter l’index et mettre à jour son “count”
  roundRobinIndexes.set(sessionId, (currentIndex + 1) % filtered.length);
  sessionMap.set(
    selectedUser.id,
    (sessionMap.get(selectedUser.id) || 0) + 1
  );

  return selectedUser;
}


async function startSegmentScheduler({
  sessionId,
  segmentDuration,
  step,
  io,
  officialStartTime,
  starterId,
}) {
  if (activeSchedulers.has(sessionId)) {
    console.log(`[Scheduler] Déjà actif pour session ${sessionId}`);
    return;
  }
  console.log(`[Scheduler] Démarrage pour session ${sessionId}`);

  // Récupère toutes les sockets de la room
  const sockets0 = await io.in(`session:${sessionId}`).fetchSockets();
  // Filtre les utilisateurs valides
  const validUsers = sockets0
    .filter(sock => sock.data.user_id && sock.data.username)
    .map(sock => ({
      id:       sock.data.user_id,
      username: sock.data.username.trim(),
      socketId: sock.id,
    }));

  if (validUsers.length === 0) {
    console.warn(`[Scheduler] Aucuns utilisateurs pour session ${sessionId}.`);
    return;
  }

  // 1) Choisit d’abord le starter, sinon un user équilibré
  let firstUser = validUsers.find(u => u.id === starterId);
  if (!firstUser) {
    console.warn(`[Scheduler] Starter ${starterId} non connecté. Choix équilibré.`);
    firstUser = selectBalancedUser(sessionId, validUsers);
  }

  // 2) Création + assignation du 1er segment
  const firstSegment = await VideoSegmentModel.insert({
    session_id: sessionId,
    start_time: convertSecondsToTime(0),
    end_time:   convertSecondsToTime(segmentDuration),
    status:     "in_progress",
    created_at: new Date(),
  });
  await SegmentUserModel.insert({
    segment_id:  firstSegment.segment_id,
    user_id:     firstUser.id,
    assigned_at: new Date(),
  });

  io.to(firstUser.socketId).emit("segment-assigned", {
    segment_id:  firstSegment.segment_id,
    session_id:  firstSegment.session_id,
    start_time:  firstSegment.start_time,
    end_time:    firstSegment.end_time,
    status:      "in_progress",
    assigned_to: firstUser.username,
    start_unix:  Number(officialStartTime),
  });
  console.log(`[WebSocket] 1er segment assigné à ${firstUser.username}`);

  // Détermine les "autres" (tous ceux qui ne sont pas le premier)
  const others = validUsers.filter(u => u.id !== firstUser.id);

  // 3) Si un second utilisateur existe, on lui crée directement un segment in_progress
  if (others.length > 0) {
    const secondUser   = others[0];
    const secondOffset = step; // 5s après le début officiel
    const secondSeg = await VideoSegmentModel.insert({
      session_id: sessionId,
      start_time: convertSecondsToTime(secondOffset),
      end_time:   convertSecondsToTime(secondOffset + segmentDuration),
      status:     "in_progress",
      created_at: new Date(),
    });
    await SegmentUserModel.insert({
      segment_id:  secondSeg.segment_id,
      user_id:     secondUser.id,
      assigned_at: new Date(),
    });
    io.to(secondUser.socketId).emit("segment-assigned", {
      segment_id:  secondSeg.segment_id,
      session_id:  secondSeg.session_id,
      start_time:  secondSeg.start_time,
      end_time:    secondSeg.end_time,
      status:      "in_progress",
      assigned_to: secondUser.username,
      start_unix:  Number(officialStartTime) + secondOffset * 1000,
    });
    console.log(`[WebSocket] 2ᵉ segment assigné à ${secondUser.username}`);
  }

  // 4) Tous les suivants en "pending"
  for (let idx = 1; idx < others.length; idx++) {
    const u            = others[idx];
    const plannedStart = (idx + 1) * step; // 10, 15, …

    const pendingSeg = await VideoSegmentModel.insert({
      session_id: sessionId,
      start_time: convertSecondsToTime(plannedStart),
      end_time:   convertSecondsToTime(plannedStart + segmentDuration),
      status:     "pending",
      created_at: new Date(),
    });
    await SegmentUserModel.insert({
      segment_id:  pendingSeg.segment_id,
      user_id:     u.id,
      assigned_at: null,
    });
    console.log(
      `[Scheduler] Segment “pending” #${pendingSeg.segment_id} pour ${u.username} (start_time=${pendingSeg.start_time}).`
    );
  }

  // 5) Boucle périodique pour basculer les pending → in_progress
  const intervalId = setInterval(async () => {
    const now = Date.now();
    const elapsed = Math.floor((now - Number(officialStartTime)) / 1000);

    // Met à jour la liste des utilisateurs connectés
    const sockets = await io.in(`session:${sessionId}`).fetchSockets();
    const users   = sockets
      .filter(s => s.data.user_id && s.data.username)
      .map(s => ({
        id:       s.data.user_id,
        username: s.data.username.trim(),
        socketId: s.id,
      }));

    for (const user of users) {
      // a) S’il a déjà un "in_progress" futur, on skip
      const hasAssigned = await VideoSegmentModel.getUpcomingAssignedSegmentForUser(
        sessionId,
        user.id,
        elapsed
      );
      if (hasAssigned) continue;

      // b) Tente de trouver un "pending"
      const pendingSegment = await VideoSegmentModel.getUpcomingPendingSegmentByUser(
        sessionId,
        user.id,
        elapsed
      );
      if (pendingSegment) {
        const startIn = convertTimeToSeconds(pendingSegment.start_time) - elapsed;
        if (startIn <= step) {
          // switch → in_progress
          await VideoSegmentModel.updateSegmentStatus(
            pendingSegment.segment_id,
            "in_progress"
          );
          await SegmentUserModel.updateAssignedAt(pendingSegment.segment_id, user.id);
          await SegmentUserModel.insert({
            segment_id:  pendingSegment.segment_id,
            user_id:     user.id,
            assigned_at: new Date(),
          });
          io.to(user.socketId).emit("segment-assigned", {
            segment_id:  pendingSegment.segment_id,
            session_id:  pendingSegment.session_id,
            start_time:  pendingSegment.start_time,
            end_time:    pendingSegment.end_time,
            status:      "in_progress",
            assigned_to: user.username,
            start_unix:  Number(officialStartTime)
                        + convertTimeToSeconds(pendingSegment.start_time) * 1000,
          });
          console.log(
            `[WebSocket] segment-assigned → #${pendingSegment.segment_id} pour ${user.username}`
          );
        }
      } else {
        // c) Crée un nouveau pending si plus aucun n'existe
        const lastSeg = await VideoSegmentModel.getLastSegment(sessionId);
        const base    = lastSeg
          ? convertTimeToSeconds(lastSeg.start_time)
          : elapsed + step;
        const nextStart = base + step;
        const newPending = await VideoSegmentModel.insert({
          session_id: sessionId,
          start_time: convertSecondsToTime(nextStart),
          end_time:   convertSecondsToTime(nextStart + segmentDuration),
          status:     "pending",
          created_at: new Date(),
        });
        await SegmentUserModel.insert({
          segment_id:  newPending.segment_id,
          user_id:     user.id,
          assigned_at: null,
        });
        console.log(
          `[Scheduler] Créé nouveau “pending” #${newPending.segment_id} pour ${user.username} (start_time=${newPending.start_time}).`
        );
      }
    }
  }, step * 1000);

  activeSchedulers.set(sessionId, intervalId);
}

/**
 * Arrête le scheduler pour une session donnée.
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
  startSegmentScheduler,
  stopSegmentScheduler,
};
