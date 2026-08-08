const express = require("express");
const router = express.Router();
const { getCategorias, crearCategoria, updateCategoria, deleteCategoria } = require("../controllers/categoriasController");
const { authMiddleware } = require("../middleware/auth");

router.get("/", authMiddleware, getCategorias);
router.post("/", authMiddleware, crearCategoria);
router.put("/:id", authMiddleware, updateCategoria);
router.delete("/:id", authMiddleware, deleteCategoria);

module.exports = router;