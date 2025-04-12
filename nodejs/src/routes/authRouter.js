const { Router } = require("express");
const signUpController = require("../controllers/auth/signUpController");
const loginController = require("../controllers/auth/loginController");
const logoutController = require("../controllers/user/logoutController");
// const sessionController = require("../controllers/sessionController");
const {
  assignSegmentController,
} = require("../controllers/stc/assignSegmentController");

const authRouter = Router();

authRouter.post("/signup", signUpController);
authRouter.post("/login", loginController);
authRouter.post("/logout", logoutController);
// Route pour assigner un segment
// authRouter.post("/assign-segment", assignSegmentController);

module.exports = authRouter;
