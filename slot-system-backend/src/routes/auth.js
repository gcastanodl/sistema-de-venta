const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { supabase } = require("../lib/supabase");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      business_id: user.business_id,
      sucursal_id: user.sucursal_id,
      rol_id: user.rol_id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
}

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Correo y contraseña requeridos" });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*, roles(nombre, permisos)")
      .eq("email", email.toLowerCase().trim())
      .eq("estado", "activo")
      .single();

    if (error || !user) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    const token = generateToken(user);
    const { password_hash, pin_pos, ...userSafe } = user;

    return res.json({ token, user: userSafe });

  } catch (err) {
    console.error("[AUTH] login error:", err);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

// POST /api/auth/pin
router.post("/pin", async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin || pin.length < 4) {
      return res.status(400).json({ message: "PIN inválido" });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*, roles(nombre, permisos)")
      .eq("pin_pos", pin)
      .eq("estado", "activo")
      .single();

    if (error || !user) {
      return res.status(401).json({ message: "PIN incorrecto" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        business_id: user.business_id,
        sucursal_id: user.sucursal_id,
        rol_id: user.rol_id,
        via: "pin",
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    const { password_hash, pin_pos, ...userSafe } = user;
    return res.json({ token, user: userSafe });

  } catch (err) {
    console.error("[AUTH] pin error:", err);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("*, roles(nombre, permisos), businesses(nombre, logo, moneda), branches(nombre)")
      .eq("id", req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const { password_hash, pin_pos, ...userSafe } = user;
    return res.json({ user: userSafe });

  } catch (err) {
    console.error("[AUTH] me error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
});

module.exports = router;