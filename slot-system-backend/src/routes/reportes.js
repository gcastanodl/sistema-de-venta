const express = require("express");
const router = express.Router();
const { getResumenDia, getVentasPorPeriodo, getProductosMasVendidos, getVentasPorCajero, getSesionesCaja } = require("../controllers/reportesController");
const { authMiddleware } = require("../middleware/auth");

router.get("/resumen-dia", authMiddleware, getResumenDia);
router.get("/ventas-periodo", authMiddleware, getVentasPorPeriodo);
router.get("/productos-mas-vendidos", authMiddleware, getProductosMasVendidos);
router.get("/ventas-cajero", authMiddleware, getVentasPorCajero);
router.get("/sesiones-caja", authMiddleware, getSesionesCaja);

module.exports = router;