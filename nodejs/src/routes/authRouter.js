const { Router } = require("express");
const signUpController = require("../controllers/auth/signUpController");
const loginController = require("../controllers/auth/loginController");
const logoutController = require("../controllers/user/logoutController");

const authRouter = Router();

authRouter.post("/signup", signUpController);
authRouter.post("/login", loginController);
// authRouter.post("/logout", logoutController);

module.exports = authRouter;
