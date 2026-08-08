const express = require("express");
const router = express.Router();
const { crearOrden, agregarItems, cobrarOrden, getOrdenesActivas, getOrdenes, getOrden, emitirComanda, eliminarOrden, eliminarItem } = require("../controllers/ordenesController");
const { authMiddleware } = require("../middleware/auth");

router.get("/", authMiddleware, getOrdenes);
router.get("/activas", authMiddleware, getOrdenesActivas);
router.post("/", authMiddleware, crearOrden);
router.post("/:id/items", authMiddleware, agregarItems);
router.post("/:id/cobrar", authMiddleware, cobrarOrden);
router.post("/:id/comanda", authMiddleware, emitirComanda);
router.delete("/:id/items/:item_id", authMiddleware, eliminarItem);
router.delete("/:id", authMiddleware, eliminarOrden);
router.get("/:id", authMiddleware, getOrden);

module.exports = router;