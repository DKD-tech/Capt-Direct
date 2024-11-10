const { Router } = require("express");
const signUpController = require("../controllers/auth/signUpController");
const loginController = require("../controllers/auth/loginController");

const authRouter = Router();

authRouter.post("/signup", signUpController);
authRouter.post("/login", loginController);

module.exports = authRouter;
