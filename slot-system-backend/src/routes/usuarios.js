const express = require("express");
const router = express.Router();
const { getUsuarios, crearUsuario, updateUsuario, deleteUsuario, getRoles } = require("../controllers/usuariosController");
const { authMiddleware } = require("../middleware/auth");

router.get("/roles", authMiddleware, getRoles);
router.get("/", authMiddleware, getUsuarios);
router.post("/", authMiddleware, crearUsuario);
router.put("/:id", authMiddleware, updateUsuario);
router.delete("/:id", authMiddleware, deleteUsuario);

module.exports = router;