const express = require("express");
const router = express.Router();
const { 
  login, 
  getNegocios, 
  crearNegocio, 
  toggleNegocio 
} = require("../controllers/superadminController");

router.post("/login", login);
router.get("/negocios", getNegocios);
router.post("/negocios", crearNegocio);
router.put("/negocios/:id/toggle", toggleNegocio);

module.exports = router;