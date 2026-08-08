const express = require("express");
const router = express.Router();
const { getProductos, crearProducto, updateProducto, toggleDisponible, deleteProducto } = require("../controllers/productosController");
const { authMiddleware } = require("../middleware/auth");

router.get("/", authMiddleware, getProductos);
router.post("/", authMiddleware, crearProducto);
router.put("/:id", authMiddleware, updateProducto);
router.put("/:id/toggle", authMiddleware, toggleDisponible);
router.delete("/:id", authMiddleware, deleteProducto);

module.exports = router;