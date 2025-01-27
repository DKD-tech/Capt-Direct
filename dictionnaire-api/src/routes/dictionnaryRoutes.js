const express = require("express");
const router = express.Router();
const { isWordValid, suggestCorrection } = require("../utils/levenshtein");

// Route pour vérifier si un mot est valide
router.get("/is-valid/:word", (req, res) => {
  const word = req.params.word.toLowerCase();
  const isValid = isWordValid(word);
  res.json({ word, isValid });
});

// Route pour suggérer une correction
router.get("/suggest/:word", (req, res) => {
  const word = req.params.word.toLowerCase();
  const correction = suggestCorrection(word);
  res.json({ word, correction });
});

module.exports = router;
