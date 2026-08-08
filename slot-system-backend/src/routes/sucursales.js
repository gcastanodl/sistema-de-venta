const express = require("express");
const router = express.Router();
const { getSucursales, crearSucursal, updateSucursal, deleteSucursal } = require("../controllers/sucursalesController");
const { authMiddleware } = require("../middleware/auth");

router.get("/", authMiddleware, getSucursales);
router.post("/", authMiddleware, crearSucursal);
router.put("/:id", authMiddleware, updateSucursal);
router.delete("/:id", authMiddleware, deleteSucursal);

module.exports = router;