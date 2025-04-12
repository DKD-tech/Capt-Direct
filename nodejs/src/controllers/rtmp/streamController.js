
const { client: redisClient } = require("../../redis/index"); // adapte ce chemin si nécessaire

// Lancer le flux pour une session (avec 5s de compte à rebours)
const startStream = async (req, res) => {
  const sessionId = req.params.sessionId;
  const countdownSeconds = 5;

  const officialStartTime = Date.now() + countdownSeconds * 1000;

  // Enregistrer le startTime dans Redis
  await redisClient.set(
    `session:${sessionId}:startTime`,
    officialStartTime.toString()
  );

  const io = req.app.get('io');
  io.to(`session:${sessionId}`).emit('stream-started', {
    startTime: officialStartTime,
  });

  return res.status(200).json({
    message: 'Flux démarré avec succès',
    startTime: officialStartTime,
  });
};

// Récupérer le startTime depuis Redis
const getSessionStartTime = async (sessionId) => {
  const stored = await redisClient.get(`session:${sessionId}:startTime`);
  return stored ? parseInt(stored, 10) : null;
};

module.exports = {
  startStream,
  getSessionStartTime,
};

//const { exec } = require("child_process");
//const SessionModel = require("../../models/SessionModel");

//async function streamSessions(req, res) {
 // try {
 //   const sessions = await SessionModel.findManyBy({ status: "active" });

  //  if (!sessions || sessions.length === 0) {
   //   return res
   //     .status(200)
    //    .json({ message: "Aucune session active trouvée." });
    //}

    //sessions.forEach((session) => {
     // const { session_id, video_url } = session;
//       const rtmpUrl = `rtmp:// 192.168.118.212/live/session_${session_id}`;

//       console.log(
//         `Streaming session ${session_id} from ${video_url} to ${rtmpUrl}`
//       );

//       const command = `
//         ffmpeg -re -i "${video_url}" \
//         -c:v libx264 -preset veryfast -tune zerolatency -b:v 1500k \
//         -c:a aac -b:a 128k -ar 44100 -ac 2 \
//         -f flv "${rtmpUrl}"
//       `;

//       exec(command, (error) => {
//         if (error) {
//           console.error(
//             `Erreur lors du streaming de la session ${session_id} :`,
//             error
//           );
//         } else {
//           console.log(`Session ${session_id} streamée avec succès.`);
//         }
//       });
//     });

//     res
//       .status(200)
//       .json({ message: "Streaming démarré pour les sessions actives." });
//   } catch (error) {
//     console.error("Erreur lors du streaming :", error);
//     res.status(500).json({ message: "Erreur serveur." });
//   }
// }

// module.exports = { streamSessions };

