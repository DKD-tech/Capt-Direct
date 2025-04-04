const express = require("express");
const app = express();
const dictionaryRoutes = require("./routes/dictionnaryRoutes");

// Middleware pour JSON
app.use(express.json());

// Routes du dictionnaire
app.use("/api/dictionary", dictionaryRoutes);

// Lancement du serveur
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API en cours d'exécution sur http:// 192.168.118.212:${PORT}`);
});
