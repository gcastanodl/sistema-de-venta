const express = require("express");
const router = express.Router();
const { getInventario, getUnidades, crearIngrediente, updateIngrediente, ajustarStock, getMovimientos, getStockBajo, eliminarIngrediente, crearUnidad, eliminarUnidad } = require("../controllers/inventarioController");
const { authMiddleware } = require("../middleware/auth");

router.get("/", authMiddleware, getInventario);
router.get("/unidades", authMiddleware, getUnidades);
router.get("/stock-bajo", authMiddleware, getStockBajo);
router.get("/movimientos", authMiddleware, getMovimientos);
router.post("/unidades", authMiddleware, crearUnidad);
router.delete("/unidades/:id", authMiddleware, eliminarUnidad);
router.post("/", authMiddleware, crearIngrediente);
router.put("/:id", authMiddleware, updateIngrediente);
router.put("/:id/ajustar", authMiddleware, ajustarStock);
router.delete("/:id", authMiddleware, eliminarIngrediente);

module.exports = router;