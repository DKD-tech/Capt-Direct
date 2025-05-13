// async function getConnectedUsers(session_id) {
//   try {
//     const { io } = require("../app"); // Accès différé à `io`

//     const room = `session:${session_id}`;
//     const clientsInRoom = await io.in(room).allSockets();

//     return [...clientsInRoom].map((socketId) => {
//       const clientSocket = io.sockets.sockets.get(socketId);
//       return {
//         user_id: clientSocket?.data.user_id || null,
//         username: clientSocket?.data.username || "Utilisateur inconnu",
//       };
//     });
//   } catch (error) {
//     console.error(
//       `Erreur lors de la récupération des utilisateurs connectés pour la session ${session_id}:`,
//       error
//     );
//     return [];
//   }
// }

// module.exports = { getConnectedUsers };
async function getConnectedUsers(io, session_id) {
  try {
    const room = `session:${session_id}`;

    console.log(
      `[getConnectedUsers] io.sockets.sockets.size = ${io.sockets.sockets.size}`
    );
    console.log(`[getConnectedUsers] session_id = ${session_id}`);

    const clientsInRoom = await io.in(room).allSockets();
    console.log(`[getConnectedUsers] clientsInRoom:`, [...clientsInRoom]);

    return [...clientsInRoom].map((socketId) => {
      const clientSocket = io.sockets.sockets.get(socketId);
      return {
        user_id: clientSocket?.data.user_id || null,
        username: clientSocket?.data.username?.trim() || "Utilisateur inconnu",
      };
    });
  } catch (error) {
    console.error(
      `Erreur lors de la récupération des utilisateurs connectés pour la session ${session_id}:`,
      error
    );
    return [];
  }
}

module.exports = { getConnectedUsers };
