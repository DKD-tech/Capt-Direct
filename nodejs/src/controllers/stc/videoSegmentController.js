// const VideoSegmentModel = require("../../models/VideoSegmentModel");
// const SegmentUserModel = require("../../models/SegmentUserModel");

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

/**
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {Promise}
 */

async function createVideoSegmentController(req, res) {
  const { session_id, video_duration } = req.body;

  if (!session_id || !video_duration) {
    return res.status(400).json({ message: "Champs obligatoires manquants" });
  }

  try {
    const segmentDuration = 60; // Durée d'un segment en secondes
    const numberOfSegments = Math.ceil(video_duration / segmentDuration);

    const segments = [];
    for (let i = 0; i < numberOfSegments; i++) {
      const start_time = convertSecondsToTime(i * segmentDuration);
      const end_time = convertSecondsToTime(
        Math.min((i + 1) * segmentDuration, video_duration)
      );
      segments.push({ session_id, start_time, end_time });
    }

    const createdSegments = await Promise.all(
      segments.map(({ session_id, start_time, end_time }) =>
        VideoSegmentModel.insert({
          session_id,
          start_time,
          end_time,
          status: "available",
          created_at: new Date(),
        })
      )
    );

    return res.status(201).json({
      message: "Segments vidéo créés avec succès",
      segments: createdSegments,
    });
  } catch (error) {
    console.error("Erreur lors de la création des segments :", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
}

async function requestHlsGeneration(session_id, video_url, segments) {
  try {
    // Vérification des données avant l'appel
    console.log("Données envoyées au service HLS :", {
      session_id,
      video_url,
      segments,
    });

    const HLS_SERVICE_URL =
      process.env.HLS_SERVICE_URL || "http://hls_service:5000";
    const response = await axios.post(`${HLS_SERVICE_URL}/generate-hls`, {
      session_id,
      video_url,
      segments,
    });
    console.log("Réponse du service HLS :", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Erreur lors de l'appel au service HLS :",
      error.response?.data || error.message
    );
    throw new Error("Impossible de générer les segments HLS");
  }
}

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

  if (!session_id) {
    return res.status(400).json({ message: "Session ID est requis." });
  }

  try {
    console.log(`Fetching segments for session ID: ${session_id}`);
    // Récupérer les segments associés à la session
    const segments = await VideoSegmentModel.findManyBy({ session_id });

    // Récupérer les sous-titres associés à chaque segment
    const segmentsWithSubtitles = await Promise.all(
      segments.map(async (segment) => {
        console.log(`Fetching subtitles for segment ID: ${segment.segment_id}`);
        const subtitles = await SubtitlesModel.findManyBy({
          segment_id: segment.segment_id,
        });
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

module.exports = {
  createVideoSegmentController,
  requestHlsGeneration,
  createHlsSegmentsController,
  getSegmentsWithSubtitles,
};
