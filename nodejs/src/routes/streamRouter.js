const { Router } = require("express");
const { streamSessions } = require("../controllers/streamController");

const router = Router();

router.post("/start", streamSessions);

module.exports = router;
