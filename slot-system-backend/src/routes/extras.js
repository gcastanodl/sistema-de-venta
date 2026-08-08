const express = require("express");
const router = express.Router();
const { getExtras, crearExtra, updateExtra, eliminarExtra } = require("../controllers/extrasController");
const { authMiddleware } = require("../middleware/auth");

router.get("/", authMiddleware, getExtras);
router.post("/", authMiddleware, crearExtra);
router.put("/:id", authMiddleware, updateExtra);
router.delete("/:id", authMiddleware, eliminarExtra);

module.exports = router;