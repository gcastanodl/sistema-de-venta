const express = require("express");
const router = express.Router();
const { getClientes, crearCliente, updateCliente } = require("../controllers/clientesController");
const { authMiddleware } = require("../middleware/auth");

router.get("/", authMiddleware, getClientes);
router.post("/", authMiddleware, crearCliente);
router.put("/:id", authMiddleware, updateCliente);

module.exports = router;