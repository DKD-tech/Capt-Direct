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
}) {
  if (activeSchedulers.has(sessionId)) {
    console.log(`[Scheduler] Déjà actif pour session ${sessionId}`);
    return;
  }
  console.log(`[Scheduler] Démarrage pour session ${sessionId}`);

  // Préavis = step secondes
  const anticipation = step;

  // 1) INITIALISATION : récupérer tous les utilisateurs connectés
  const sockets0 = await io.in(`session:${sessionId}`).fetchSockets();
  const validUsers0 = sockets0
    .filter(sock => sock.data.user_id && sock.data.username)
    .map(sock => ({
      id:       sock.data.user_id,
      username: sock.data.username.trim(),
      socketId: sock.id,
    }));

  if (validUsers0.length === 0) {
    console.warn(`[Scheduler] Aucuns utilisateurs pour session ${sessionId}.`);
    return;
  }

  // 1.b) Premier segment → débute à 0s, status="in_progress", assignation immédiate
  const firstUser = selectBalancedUser(sessionId, validUsers0);
  if (!firstUser) {
    console.warn(`[Scheduler] Aucun utilisateur éligible pour le 1er segment.`);
    return;
  }

  const firstSegment = await VideoSegmentModel.insert({
    session_id: sessionId,
    start_time: convertSecondsToTime(0),               // "00:00:00"
    end_time:   convertSecondsToTime(segmentDuration), // "00:00:10" si segmentDuration=10
    status:     "in_progress",
    created_at: new Date(),
  });

  // Assignation immédiate dans segment_users
  await SegmentUserModel.insert({
    segment_id:  firstSegment.segment_id,
    user_id:     firstUser.id,
    assigned_at: new Date(),
  });

  // Envoi du socket "segment-assigned" pour le premier user
  {
    const socketId = firstUser.socketId;
    if (socketId) {
      const socketModule = await import("../config/socket.js");
      const ioSocket = socketModule.io || socketModule.default;
      ioSocket.to(socketId).emit("segment-assigned", {
        segment_id:  firstSegment.segment_id,
        session_id:  firstSegment.session_id,
        start_time:  firstSegment.start_time,
        end_time:    firstSegment.end_time,
        status:      "in_progress",
        assigned_to: firstUser.username,
        start_unix:  Number(officialStartTime),
      });
      console.log(`[WebSocket] Premier segment assigné à ${firstUser.username}`);
    } else {
      console.warn(`[Scheduler] Premier user (${firstUser.id}) sans socketId.`);
    }
  }

  // 1.c) Pour les autres utilisateurs, créer un segment "pending" dès maintenant
  const others = validUsers0.filter(u => u.id !== firstUser.id);
  for (let idx = 0; idx < others.length; idx++) {
    const u = others[idx];
    const plannedStart = (idx + 1) * step; // ex. 5, 10, 15, …

    const pendingSeg = await VideoSegmentModel.insert({
      session_id: sessionId,
      start_time: convertSecondsToTime(plannedStart),
      end_time:   convertSecondsToTime(plannedStart + segmentDuration),
      status:     "pending",
      created_at: new Date(),
    });

    // Réserver dans segment_users sans assigned_at (NULL)
    await SegmentUserModel.insert({
      segment_id:  pendingSeg.segment_id,
      user_id:     u.id,
      assigned_at: null,
    });

    console.log(
      `[Scheduler] Segment “pending” #${pendingSeg.segment_id} pour ${u.username} (start_time=${pendingSeg.start_time}).`
    );
  }

  // 2) BOUCLE DE TICK (toutes les step secondes)
  const intervalId = setInterval(async () => {
    const now = Date.now();
    const elapsedSinceStart = Math.floor((now - Number(officialStartTime)) / 1000);

    // 2.a) Mettre à jour la liste des utilisateurs connectés
    const sockets = await io.in(`session:${sessionId}`).fetchSockets();
    const validUsers = sockets
      .filter(sock => sock.data.user_id && sock.data.username)
      .map(sock => ({
        id:       sock.data.user_id,
        username: sock.data.username.trim(),
        socketId: sock.id,
      }));

    // 2.b) Pour chaque utilisateur, vérifier/assigner
    for (const user of validUsers) {
      // 2.b.1) S’il a déjà un segment “in_progress” planifié dans le futur, on skip
      const hasAssigned = await VideoSegmentModel.getUpcomingAssignedSegmentForUser(
        sessionId,
        user.id,
        elapsedSinceStart
      );
      if (hasAssigned) {
        continue;
      }

      // 2.b.2) Chercher s’il existe un segment “pending” pour CE user
      const pendingSegment = await VideoSegmentModel.getUpcomingPendingSegmentByUser(
        sessionId,
        user.id,
        elapsedSinceStart
      );

      if (pendingSegment) {
        // Combien de secondes avant le début
        const startIn = convertTimeToSeconds(pendingSegment.start_time) - elapsedSinceStart;
        if (startIn <= anticipation) {
          // 2.b.2.a) Basculer ce “pending” en “in_progress”
          await VideoSegmentModel.updateSegmentStatus(
            pendingSegment.segment_id,
            "in_progress"
          );
          // À la place d’un INSERT, on met juste à jour assigned_at du row existant
         await SegmentUserModel.updateAssignedAt(pendingSegment.segment_id, user.id);

          // **Ici** on ré-insère dans segment_users avec assigned_at = NOW()
          await SegmentUserModel.insert({
            segment_id:  pendingSegment.segment_id,
            user_id:     user.id,
            assigned_at: new Date(),
          });

          // Émettre le WS “segment-assigned”
          const socketId = user.socketId;
          if (socketId) {
            const socketModule = await import("../config/socket.js");
            const ioSocket = socketModule.io || socketModule.default;
            ioSocket.to(socketId).emit("segment-assigned", {
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
              `[WebSocket] “segment-assigned” → segment ${pendingSegment.segment_id} pour ${user.username}`
            );
          }
        }
      } else {
        // 2.b.3) Si aucun “pending” pour ce user → créer UN NOUVEAU segment “pending”
        const lastSeg = await VideoSegmentModel.getLastSegment(sessionId);
        let nextStart;
        if (lastSeg) {
          // **CHEVAUCHEMENT** : on prend lastSeg.start_time + step (et non lastSeg.end_time)
          const lastStartSec = convertTimeToSeconds(lastSeg.start_time);
          nextStart = lastStartSec + step;
        } else {
          // Cas extrême : pas de lastSeg, on décale “now + anticipation”
          nextStart = elapsedSinceStart + anticipation;
        }

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
