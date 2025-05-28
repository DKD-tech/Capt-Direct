// const VideoSegmentModel = require("../../models/VideoSegmentModel");
const SegmentUserModel = require("../../models/SegmentUserModel");

// async function createVideoSegmentController(req, res) {
//   // const { session_id, start_time, end_time, status } = req.body;

//   // if (!session_id || !start_time || !end_time) {
//   //   return res
//   //     .status(400)
//   //     .json({ message: "Les champs obligatoires sont manquants" });
//   // }

//   // try {
//   //   const segment = await VideoSegmentModel.insert({
//   //     session_id,
//   //     start_time,
//   //     end_time,
//   //     status: status || "available", // statut par défaut
//   //     created_at: new Date(),
//   //   });
//   //   return res.status(201).json({
//   //     message: "Segment vidéo crée avec succès",
//   //     segment: segment,
//   //   });
//   // } catch (error) {
//   //   console.error("Erreur lors de la création du segment :", error);
//   //   return res.status(500).json({ message: "Erreur serveur" });
//   // }
//   // }
//   const { session_id, video_duration } = req.body;
//   // const { session_id, start_time, end_time, status, video_duration } = req.body;

//   // Vérifier les champs obligatoires
//   // if (!session_id) {
//   //   return res
//   //     .status(400)
//   //     .json({ message: "L'ID de la session est obligatoire" });
//   // }

//   if (!session_id || !video_duration) {
//     return res
//       .status(400)
//       .json({ message: "Les champs session_id et video_duration sont requis" });
//   }

//   //   try {
//   //     // Si une durée vidéo est fournie, générer automatiquement les segments
//   //     if (video_duration) {
//   //       const segmentDuration = 60; // Durée de chaque segment en secondes
//   //       const segments = [];

//   //       for (let start = 0; start < video_duration; start += segmentDuration) {
//   //         const end = Math.min(start + segmentDuration, video_duration);

//   //         segments.push({
//   //           session_id,
//   //           start_time: start,
//   //           end_time: end,
//   //           status: "available", // Par défaut, le segment est disponible
//   //           created_at: new Date(),
//   //         });
//   //       }

//   //       // Insérer tous les segments générés dans la base de données
//   //       const createdSegments = [];
//   //       for (const segment of segments) {
//   //         const newSegment = await VideoSegmentModel.insert(segment);
//   //         createdSegments.push(newSegment);
//   //       }

//   //       return res.status(201).json({
//   //         message: "Segments vidéo créés automatiquement avec succès",
//   //         segments: createdSegments,
//   //       });
//   //     }

//   //     // Sinon, insérer un seul segment
//   //     if (!start_time || !end_time) {
//   //       return res
//   //         .status(400)
//   //         .json({ message: "Les champs start_time et end_time sont requis" });
//   //     }

//   //     const segment = await VideoSegmentModel.insert({
//   //       session_id,
//   //       start_time,
//   //       end_time,
//   //       status: status || "available", // statut par défaut
//   //       created_at: new Date(),
//   //     });

//   //     return res.status(201).json({
//   //       message: "Segment vidéo créé avec succès",
//   //       segment,
//   //     });
//   //   } catch (error) {
//   //     console.error("Erreur lors de la création du segment :", error);
//   //     return res.status(500).json({ message: "Erreur serveur" });
//   //   }
//   // }

//   try {
//     // Segmentation automatique de la vidéo (durée divisée par 60s)
//     const segmentDuration = 60; // Segmenter toutes les 60 secondes
//     const segments = [];
//     for (let start = 0; start < video_duration; start += segmentDuration) {
//       const end = Math.min(start + segmentDuration, video_duration);
//       segments.push({
//         session_id,
//         start_time: start,
//         end_time: end,
//         status: "available", // Par défaut, le segment est disponible
//         created_at: new Date(),
//       });
//     }

//     // Insérer tous les segments dans la base de données
//     const createdSegments = [];
//     for (const segment of segments) {
//       const newSegment = await VideoSegmentModel.insert(segment);
//       createdSegments.push(newSegment);
//     }

//     // Récupérer les utilisateurs connectés à la session
//     const usersInSession = await SegmentUserModel.findUsersBySessionId(
//       session_id
//     );

//     if (usersInSession.length === 0) {
//       return res.status(201).json({
//         message:
//           "Segments créés, mais aucun utilisateur connecté pour les assigner.",
//         segments: createdSegments,
//       });
//     }

//     // Assigner dynamiquement les segments aux utilisateurs connectés
//     const totalUsers = usersInSession.length;
//     const assignments = [];

//     createdSegments.forEach((segment, index) => {
//       const userId = usersInSession[index % totalUsers].user_id; // Répartition équitable
//       assignments.push({
//         user_id: userId,
//         segment_id: segment.segment_id,
//         assigned_at: new Date(),
//       });
//     });

//     // Insérer les assignations dans la table `segment_users`
//     for (const assignment of assignments) {
//       await SegmentUserModel.insert(assignment);
//       await VideoSegmentModel.updateOneById(assignment.segment_id, {
//         status: "in_progress",
//       });
//     }

//     return res.status(201).json({
//       message: "Segments créés et assignés automatiquement",
//       segments: createdSegments,
//       assignments,
//     });
//   } catch (error) {
//     console.error(
//       "Erreur lors de la création et de l'assignation des segments :",
//       error
//     );
//     return res.status(500).json({ message: "Erreur serveur" });
//   }
// }

// module.exports = { createVideoSegmentController };
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const VideoSegmentModel = require("../../models/VideoSegmentModel");
const SessionModel = require("../../models/SessionModel");
const SubtitlesModel = require("../../models/SubtitleModel");
const axios = require("axios");
const { mergeSortSegments } = require("../../utils/mergeSortSegment");
const { setAsync, getAsync, lRangeAsync } = require("../../redis/index");
const {
  startSegmentScheduler,
  stopSegmentScheduler,
} = require("../../helpers/segmentScheduler");
// const { requestHlsGeneration } = require("../../../../hls_service/hls_service");

// async function segmentVideo(session_id, video_duration) {
//   const segmentDuration = 60; // Durée d'un segment en secondes
//   const totalSegments = Math.ceil(video_duration / segmentDuration);

//   const segments = [];
//   for (let i = 0; i < totalSegments; i++) {
//     const start_time = i * segmentDuration;
//     const end_time = Math.min((i + 1) * segmentDuration, video_duration);

//     segments.push({
//       session_id,
//       start_time,
//       end_time,
//       status: "available",
//       created_at: new Date(),
//     });
//   }

//   return await Promise.all(
//     segments.map((segment) => VideoSegmentModel.insert(segment))
//   );
// }

// async function createVideoSegmentController(req, res) {
//   const { session_id, video_duration } = req.body;

//   if (!session_id || !video_duration) {
//     return res
//       .status(400)
//       .json({ message: "Les champs obligatoires sont manquants" });
//   }

//   try {
//     const segments = await segmentVideo(session_id, video_duration);
//     return res
//       .status(201)
//       .json({ message: "Segments créés avec succès", segments });
//   } catch (error) {
//     console.error("Erreur lors de la création des segments :", error);
//     return res.status(500).json({ message: "Erreur serveur" });
//   }
// }

// module.exports = { createVideoSegmentController };
const {
  convertSecondsToTime,
  convertTimeToSeconds,
} = require("../../utils/timeUtils");
const { getConnectedUsers } = require("../../utils/socketUtils");
const client = require("../../redis/index");
const { assignSegmentsToUsers } = require("./assignSegmentController");
const { socketUsers } = require("../../app"); // Assurez-vous que socketUsers est exporté depuis app.js
const SegmentStatus = require("../../utils/SegmentStatus");
/**
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {Promise}
 */

async function createVideoSegmentController(req, res) {
  const { session_id } = req.body;

  if (!session_id) {
    return res.status(400).json({ message: "Champs obligatoires manquants." });
  }

  try {
    console.log(
      "Début de la création des segments pour la session :",
      session_id
    );

    // Vérifier si des segments existent déjà pour cette session
    const existingSegments = await VideoSegmentModel.findManyBy({ session_id });
    console.log("Segments existants :", existingSegments);

    if (existingSegments && existingSegments.length > 0) {
      console.log(
        "Les segments existent déjà. Vérification des assignations..."
      );
      const availableSegments = existingSegments.filter(
        (segment) => segment.status === SegmentStatus.AVAILABLE
      );

      if (availableSegments.length > 0) {
        console.log("Assignation des segments disponibles...");
        const assignments = await assignSegmentsToUsers(
          session_id,
          availableSegments
        );
        return res.status(201).json({
          message: "Segments existants assignés avec succès.",
          segments: availableSegments,
          assignments,
        });
      }

      return res.status(200).json({
        message: "Aucun segment disponible à assigner.",
        segments: existingSegments,
      });
    }

    // Récupérer la durée de la vidéo depuis Redis
    const durationKey = `video:duration:${session_id}`;
    const duration = await getAsync(durationKey);
    console.log("Durée de la vidéo :", duration);

    if (!duration) {
      return res
        .status(400)
        .json({ message: "Durée non trouvée pour cette session." });
    }

    // Générer les segments
    const segmentDuration = 10; // Durée d'un segment en secondes
    const numberOfSegments = Math.ceil(duration / segmentDuration);
    const segments = [];

    for (let i = 0; i < numberOfSegments; i++) {
      const start_time = i * segmentDuration;
      const end_time = Math.min((i + 1) * segmentDuration, duration);

      segments.push({
        session_id,
        start_time: convertSecondsToTime(start_time),
        end_time: convertSecondsToTime(end_time),
        status: SegmentStatus.AVAILABLE,
        created_at: new Date(),
      });
    }

    console.log("Segments générés :", segments);

    // Insérer les segments dans la base de données
    const createdSegments = await Promise.all(
      segments.map((segment) => VideoSegmentModel.insert(segment))
    );
    console.log("Segments créés :", createdSegments);

    // Assigner les segments aux utilisateurs
    console.log("Appel de assignSegmentsToUsers...");
    const assignments = await assignSegmentsToUsers(
      session_id,
      createdSegments
    );
    console.log("Assignations effectuées :", assignments);

    return res.status(201).json({
      message: "Segments créés et assignés avec succès.",
      segments: createdSegments,
      assignments,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la segmentation et de l'assignation :",
      error
    );
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

async function storeVideoDurationController(req, res) {
  const { sessionId } = req.params;
  const { duration } = req.body;

  if (!duration || !sessionId) {
    return res
      .status(400)
      .json({ message: "Session ID et durée sont requis." });
  }

  try {
    const redisKey = `video:duration:${sessionId}`;
    await setAsync(redisKey, duration); // Stocker la durée dans Redis avec une clé unique

    return res
      .status(200)
      .json({ message: "Durée de la vidéo stockée avec succès." });
  } catch (error) {
    console.error(
      "Erreur lors du stockage de la durée de la vidéo dans Redis :",
      error
    );
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

// Route pour récupérer la durée
async function getVideoDuration(req, res) {
  const { sessionId } = req.params;

  if (!sessionId) {
    return res.status(400).json({ message: "Session ID est requis." });
  }

  try {
    const redisKey = `video:duration:${sessionId}`;
    const duration = await getAsync(redisKey);

    if (!duration) {
      return res.status(404).json({ message: "Durée non trouvée dans Redis." });
    }

    return res.status(200).json({ duration });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de la durée de la vidéo depuis Redis :",
      error
    );
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

// async function requestHlsGeneration(session_id, video_url, segments) {
//   try {
//     // Vérification des données avant l'appel
//     console.log("Données envoyées au service HLS :", {
//       session_id,
//       video_url,
//       segments,
//     });

//     const HLS_SERVICE_URL =
//       process.env.HLS_SERVICE_URL || "http://hls_service:5000";
//     const response = await axios.post(`${HLS_SERVICE_URL}/generate-hls`, {
//       session_id,
//       video_url,
//       segments,
//     });
//     console.log("Réponse du service HLS :", response.data);
//     return response.data;
//   } catch (error) {
//     console.error(
//       "Erreur lors de l'appel au service HLS :",
//       error.response?.data || error.message
//     );
//     throw new Error("Impossible de générer les segments HLS");
//   }
// }

// Contrôleur pour générer des segments HLS
async function createHlsSegmentsController(req, res) {
  const { session_id, video_duration } = req.body;

  if (!session_id || !video_duration) {
    return res.status(400).json({
      message: "Champs obligatoires manquants : session_id ou video_duration.",
    });
  }

  try {
    const session = await SessionModel.findOneById(session_id, "session_id");
    if (!session || !session.video_url) {
      return res
        .status(404)
        .json({ message: "Session introuvable ou sans vidéo associée." });
    }

    let finalVideoUrl = session.video_url;
    if (!finalVideoUrl.startsWith("http")) {
      finalVideoUrl = `/usr/src/app/videos/${finalVideoUrl}`;
    }

    // Appel au service HLS
    const hlsResponse = await requestHlsGeneration(
      session_id,
      finalVideoUrl,
      video_duration
    );

    return res.status(200).json({
      message: "Segmentation demandée avec succès.",
      hlsOutput: hlsResponse,
    });
  } catch (error) {
    console.error("Erreur lors de la segmentation :", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

//Recuperation des segments
async function getSegmentsWithSubtitles(req, res) {
  const { session_id } = req.params;
  const user_id = req.user?.user_id || req.user?.id;

  if (!session_id || !user_id) {
    return res
      .status(400)
      .json({ message: "Session ID et User ID sont requis." });
  }

  try {
    // console.log(`Fetching segments for session ID: ${session_id}`);
    // Récupérer les segments associés à la session
    // const segments = await VideoSegmentModel.findManyBy({ session_id });

    // Récupérer les segments associés à la session avec les noms des utilisateurs assignés
    const segments = await VideoSegmentModel.findManyByWithUsers(
      session_id,
      user_id
    );

    // Trier les segments par start_time
    const sortedSegments = mergeSortSegments(segments);

    // Récupérer les sous-titres associés à chaque segment
    const segmentsWithSubtitles = await Promise.all(
      sortedSegments.map(async (segment) => {
        // console.log(`Fetching subtitles for segment ID: ${segment.segment_id}`);
        const subtitles = await SubtitlesModel.findManyBy({
          segment_id: segment.segment_id,
        });

        // const sortedSubtitles = mergeSort(subtitles, (a, b) => {
        //   return new Date(a.created_at) - new Date(b.created_at);
        // });
        return { ...segment, subtitles };
      })
    );

    return res.status(200).json({
      message: "Segments avec sous-titres récupérés.",
      segments: segmentsWithSubtitles,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des segments et sous-titres :",
      error
    );
    return res.status(500).json({ message: "Erreur serveur." });
  }
}
async function handleUserDisconnection(req, res) {
  const { user_id, session_id } = req.body;

  if (!user_id || !session_id) {
    return res
      .status(400)
      .json({ message: "Les champs obligatoires sont manquants" });
  }

  try {
    // Étape 1 : Récupérer les segments associés à cette session
    const redisKey = `session:${session_id}:segments`;
    const segments = await client.lRangeAsync(redisKey, 0, -1);

    // Étape 2 : Identifier les segments à redistribuer
    const segmentsToRedistribute = [];
    const updatedSegments = segments.map((segment) => {
      const parsedSegment = JSON.parse(segment);

      if (parsedSegment.assigned_to === user_id) {
        // Segments assignés à l'utilisateur déconnecté
        if (parsedSegment.status === SegmentStatus.IN_PROGRESS) {
          console.log(
            `Segment ${parsedSegment.segment_id} est en cours. Non redistribué.`
          );
          return parsedSegment; // Les segments en cours ne sont pas modifiés
        }

        // Marquer comme disponible pour redistribution
        parsedSegment.status = SegmentStatus.AVAILABLE;
        parsedSegment.assigned_to = null;
        segmentsToRedistribute.push(parsedSegment);
      }

      return parsedSegment;
    });

    // Mise à jour des segments dans Redis
    await client.delAsync(redisKey);

    await Promise.all(
      updatedSegments.map((segment) =>
        client.rPush(redisKey, JSON.stringify(segment))
      )
    );

    // Étape 3 : Redistribuer les segments disponibles
    if (segmentsToRedistribute.length > 0) {
      const connectedUsers = await SegmentUserModel.findConnectedUsers(
        session_id
      );

      if (!connectedUsers || connectedUsers.length === 0) {
        console.log(
          "Aucun utilisateur connecté. Les segments restent disponibles."
        );
        return res.status(200).json({
          message: "Aucun utilisateur connecté. Redistribution non effectuée.",
          availableSegments: segmentsToRedistribute,
        });
      }

      // Réassigner les segments disponibles
      const totalUsers = connectedUsers.length;
      segmentsToRedistribute.forEach((segment, index) => {
        const userToAssign = connectedUsers[index % totalUsers].user_id;
        segment.assigned_to = userToAssign;
        segment.status = SegmentStatus.IN_PROGRESS; // Les segments deviennent en cours
      });

      // Mise à jour Redis après redistribution
      const pipelineRedistribution = client.pipeline();
      segmentsToRedistribute.forEach((segment) =>
        pipelineRedistribution.rPush(redisKey, JSON.stringify(segment))
      );
      await pipelineRedistribution.exec();

      return res.status(200).json({
        message: "Segments redistribués avec succès.",
        redistributedSegments: segmentsToRedistribute,
      });
    }

    return res.status(200).json({
      message: "Aucun segment à redistribuer.",
    });
  } catch (error) {
    console.error("Erreur lors de la gestion de la déconnexion :", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

async function addSegments(req, res) {
  const { session_id, segments } = req.body;

  if (!session_id || !Array.isArray(segments)) {
    return res.status(400).json({ message: "Session ID et segments requis." });
  }

  try {
    const insertedSegments = [];
    for (const segment of segments) {
      const newSegment = await VideoSegmentModel.insert({
        session_id,
        start_time: segment.start_time,
        end_time: segment.end_time,
        status: "available",
        created_at: new Date(),
      });
      insertedSegments.push(newSegment);
    }

    return res.status(201).json({
      message: "Segments ajoutés avec succès.",
      segments: insertedSegments,
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout des segments :", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}

async function saveSubtitlesToDB(req, res) {
  const { segment_id } = req.params;
  const redisKey = `segment:${segment_id}:subtitles`;

  try {
    const subtitles = await client.lRange(redisKey, 0, -1);

    // Sauvegarder dans PostgreSQL
    for (const subtitle of subtitles) {
      const parsed = JSON.parse(subtitle);
      await SubtitleModel.addSubtitle(parsed);
    }

    // Supprimer les données de Redis
    await client.del(redisKey);

    res.status(200).json({ message: "Sous-titres sauvegardés avec succès." });
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des sous-titres :", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
}

// async function startStreaming(req, res) {
//   const { sessionId } = req.params;

//   try {
//     // Récupérer l'URL de la vidéo associée à la session
//     const session = await SessionModel.findOneById(sessionId, ["video_url"]);
//     if (!session || !session.video_url) {
//       return res
//         .status(404)
//         .json({ message: "Vidéo introuvable pour cette session." });
//     }

//     const videoPath = path.join(
//       process.env.VIDEO_DIRECTORY || "/usr/src/app/videos",
//       session.video_url
//     );
//     if (!fs.existsSync(videoPath)) {
//       return res
//         .status(404)
//         .json({ message: "Le fichier vidéo n’existe pas dans Docker." });
//     }

//     // Démarrer le script de streaming
//     exec(
//       `bash ./stream_video.sh ${sessionId} ${videoPath}`,
//       (error, stdout, stderr) => {
//         if (error) {
//           console.error("Erreur lors du démarrage du streaming :", stderr);
//           return res.status(500).json({ message: "Erreur lors du streaming." });
//         }
//         console.log("Streaming démarré :", stdout);
//         res.status(200).json({ message: "Streaming démarré avec succès." });
//       }
//     );
//   } catch (error) {
//     console.error("Erreur lors du démarrage du streaming :", error);
//     res.status(500).json({ message: "Erreur serveur." });
//   }
// }
// Assurez-vous que VIDEO_DIRECTORY est chargé

// async function startStreaming(req, res) {
//   const { sessionId } = req.params;

//   try {
//     // Récupérer la session et valider les données
//     const session = await SessionModel.findOneById(sessionId, ["video_url"]);
//     console.log("Session trouvée :", session);
//     if (!session || !session.video_url) {
//       return res.status(404).json({ message: "Session ou vidéo introuvable." });
//     }

//     // Construire le chemin absolu de la vidéo
//     const videoPath = path.join("/usr/src/app/videos", session.video_url);

//     // Vérifiez que le fichier existe
//     if (!fs.existsSync(videoPath)) {
//       return res.status(404).json({
//         message: `Le fichier vidéo ${session.video_url} est introuvable.`,
//       });
//     }

//     // Commande pour exécuter le script de segmentation
//     const command = `bash ./stream_with_autorefresh.sh ${sessionId} ${videoPath}`;

//     exec(command, (error, stdout, stderr) => {
//       if (error) {
//         console.error("Erreur lors du streaming :", stderr);
//         return res
//           .status(500)
//           .json({ message: "Erreur lors du démarrage du streaming." });
//       }
//       console.log("Streaming démarré :", stdout);
//       res.status(200).json({
//         message: "Streaming démarré avec succès.",
//         hls_url: `/hls/session-${sessionId}/playlist.m3u8`,
//       });
//     });
//   } catch (error) {
//     console.error("Erreur backend :", error);
//     res.status(500).json({ message: "Erreur serveur." });
//   }
// }
// async function startStreaming(req, res) {
//   const { sessionId } = req.params;
//   console.log("Session ID reçu :", sessionId); // Journal du sessionId

//   try {
//     const session = await SessionModel.findOneById(sessionId, ["video_url"]);
//     console.log("Session trouvée :", session); // Journal de la session trouvée

//     if (!session || !session.video_url) {
//       console.log("Session ou vidéo introuvable.");
//       return res.status(404).json({ message: "Session ou vidéo introuvable." });
//     }

//     const videoPath = path.join(VIDEO_DIRECTORY, session.video_url);
//     console.log("Chemin absolu de la vidéo :", videoPath); // Journal du chemin vidéo

//     if (!fs.existsSync(videoPath)) {
//       console.log("Le fichier vidéo n’existe pas :", videoPath);
//       return res
//         .status(404)
//         .json({ message: "Le fichier vidéo n’existe pas." });
//     }

//     // Lancer le script de streaming
//     exec(
//       `bash ./stream_video.sh ${sessionId} ${videoPath}`,
//       (error, stdout, stderr) => {
//         if (error) {
//           console.error("Erreur lors du streaming :", stderr);
//           return res.status(500).json({ message: "Erreur lors du streaming." });
//         }
//         console.log("Streaming démarré :", stdout);
//         res.status(200).json({ message: "Streaming démarré avec succès." });
//       }
//     );
//   } catch (error) {
//     console.error("Erreur serveur :", error);
//     res.status(500).json({ message: "Erreur serveur." });
//   }
// }
async function startSegmentationController(req, res) {
  const session_id = req.params.sessionId;

  if (!session_id) {
    return res.status(400).json({ message: "session_id manquant" });
  }

  try {
    const io = req.app.get("io"); // ✅ d'abord récupérer io

    if (!io) {
      return res.status(500).json({ message: "Socket.io non initialisé" });
    }

    const connectedUsers = await getConnectedUsers(io, session_id); // ✅ maintenant utiliser io

    if (!connectedUsers || connectedUsers.length === 0) {
      return res
        .status(200)
        .json({ message: "Aucun utilisateur connecté à cette session" });
    }

    const users = connectedUsers.map((user) => ({
      id: user.user_id,
      username: user.username,
      activeSegmentCount: 0,
      lastActiveAt: new Date(),
    }));

    startSegmentScheduler({
      sessionId: session_id,
      segmentDuration: 10,
      step: 5,
      users,
      io: req.app.get("io"),
      socketUsers,
    });

    return res
      .status(200)
      .json({ message: "Segmentation collaborative lancée" });
  } catch (err) {
    console.error("Erreur démarrage segmentation :", err);
    return res.status(500).json({ message: "Erreur interne" });
  }
}

async function stopSegmentationController(req, res) {
  const sessionId = req.params.sessionId;

  if (!sessionId) {
    return res.status(400).json({ message: "sessionId manquant" });
  }

  stopSegmentScheduler(sessionId);

  // Émettre un signal au frontend pour stopper aussi côté client
  const io = req.app.get("io"); // Récupère Socket.IO depuis app
  io.to(`session:${sessionId}`).emit("segmentation-stopped");

  return res.status(200).json({
    message: `Segmentation arrêtée pour la session ${sessionId}`,
  });
}
module.exports = {
  createVideoSegmentController,
  createHlsSegmentsController,
  getSegmentsWithSubtitles,
  storeVideoDurationController,
  getVideoDuration,
  storeVideoDurationController,
  addSegments,
  saveSubtitlesToDB,
  handleUserDisconnection,
  startSegmentationController,
  stopSegmentationController,
};
