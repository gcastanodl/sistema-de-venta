const express = require("express");
const router = express.Router();
const { getSuplidores, crearSuplidor, updateSuplidor, deleteSuplidor } = require("../controllers/suplidoresController");
const { authMiddleware } = require("../middleware/auth");

router.get("/", authMiddleware, getSuplidores);
router.post("/", authMiddleware, crearSuplidor);
router.put("/:id", authMiddleware, updateSuplidor);
router.delete("/:id", authMiddleware, deleteSuplidor);

module.exports = router;