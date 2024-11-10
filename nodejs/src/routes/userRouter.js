const { Router } = require("express");
const updateUserController = require("../controllers/user/updateUserController");
const deleteUserController = require("../controllers/user/deleteUserController");
const logoutController = require("../controllers/user/logoutController");
const updatePasswordController = require("../controllers/user/updatePasswordController");
const authMiddleware = require("../middlewares/authMiddleware"); // Protéger ces routes

const userRouter = Router();

// Routes pour les opérations utilisateur
userRouter.patch("/", authMiddleware, updateUserController); // Mise à jour des informations utilisateur
userRouter.delete("/", authMiddleware, deleteUserController); // Suppression du compte utilisateur
userRouter.post("/logout", authMiddleware, logoutController); // Déconnexion
userRouter.post("/update-password", authMiddleware, updatePasswordController); // Mise à jour du mot de passe

module.exports = userRouter;
