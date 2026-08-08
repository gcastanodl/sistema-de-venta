const express = require("express");
const router = express.Router();
const { getRecetas, crearReceta, eliminarReceta } = require("../controllers/recetasController");
const { authMiddleware } = require("../middleware/auth");

router.get("/", authMiddleware, getRecetas);
router.post("/", authMiddleware, crearReceta);
router.delete("/:id", authMiddleware, eliminarReceta);

module.exports = router;