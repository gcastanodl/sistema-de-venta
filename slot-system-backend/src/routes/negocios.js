const express = require("express");
const router = express.Router();
const { getNegocio, updateNegocio, verificarClaveDescuento } = require("../controllers/negociosController");
const { authMiddleware } = require("../middleware/auth");

router.get("/:id", authMiddleware, getNegocio);
router.put("/:id", authMiddleware, updateNegocio);
router.post("/:id/verificar-descuento", authMiddleware, verificarClaveDescuento);

module.exports = router;