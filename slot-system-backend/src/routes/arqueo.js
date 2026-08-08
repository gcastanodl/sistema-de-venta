const express = require("express");
const router = express.Router();
const { getDenominaciones, guardarArqueo, getResumen } = require("../controllers/arqueoController");
const { authMiddleware } = require("../middleware/auth");

router.get("/denominaciones", authMiddleware, getDenominaciones);
router.post("/guardar", authMiddleware, guardarArqueo);
router.get("/resumen/:sesion_id", authMiddleware, getResumen);

module.exports = router;