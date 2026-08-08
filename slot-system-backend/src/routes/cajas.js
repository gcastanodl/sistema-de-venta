const express = require("express");
const router = express.Router();
const { getCajas, crearCaja, getSesionActiva, abrirCaja, cerrarCaja, getSesiones } = require("../controllers/cajasController");
const { authMiddleware } = require("../middleware/auth");

router.get("/", authMiddleware, getCajas);
router.post("/", authMiddleware, crearCaja);
router.get("/sesion-activa", authMiddleware, getSesionActiva);
router.post("/abrir", authMiddleware, abrirCaja);
router.post("/cerrar", authMiddleware, cerrarCaja);
router.get("/sesiones", authMiddleware, getSesiones);

module.exports = router;