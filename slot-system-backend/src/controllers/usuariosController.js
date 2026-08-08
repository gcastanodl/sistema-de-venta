const bcrypt = require("bcryptjs");
const { supabase } = require("../lib/supabase");

// GET /api/usuarios?business_id=xxx
async function getUsuarios(req, res) {
  try {
    const { business_id } = req.query;

    const { data, error } = await supabase
      .from("users")
      .select("id, nombre, apellido, email, telefono, pin_pos, estado, rol_id, sucursal_id, created_at, roles(nombre)")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json({ usuarios: data });
  } catch (err) {
    console.error("[USUARIOS] getUsuarios error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// POST /api/usuarios
async function crearUsuario(req, res) {
  try {
    const { business_id, sucursal_id, nombre, apellido, email, password, rol_id, telefono, pin_pos } = req.body;

    if (!business_id || !nombre || !apellido || !rol_id) {
      return res.status(400).json({ message: "Faltan campos requeridos" });
    }

    let password_hash = null;
    if (password) {
      password_hash = await bcrypt.hash(password, 10);
    }

    const { data, error } = await supabase
      .from("users")
      .insert([{
        business_id,
        sucursal_id,
        nombre,
        apellido,
        email,
        password_hash,
        rol_id,
        telefono,
        pin_pos,
        estado: "activo"
      }])
      .select("id, nombre, apellido, email, telefono, pin_pos, estado, rol_id, sucursal_id, created_at, roles(nombre)")
      .single();

    if (error) throw error;
    return res.status(201).json({ usuario: data });
  } catch (err) {
    console.error("[USUARIOS] crearUsuario error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// PUT /api/usuarios/:id
async function updateUsuario(req, res) {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, telefono, pin_pos, rol_id, sucursal_id, estado } = req.body;

    const { data, error } = await supabase
      .from("users")
      .update({ nombre, apellido, email, telefono, pin_pos, rol_id, sucursal_id, estado })
      .eq("id", id)
      .select("id, nombre, apellido, email, telefono, pin_pos, estado, rol_id, sucursal_id, roles(nombre)")
      .single();

    if (error) throw error;
    return res.json({ usuario: data });
  } catch (err) {
    console.error("[USUARIOS] updateUsuario error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// DELETE /api/usuarios/:id
async function deleteUsuario(req, res) {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("users")
      .update({ estado: "inactivo" })
      .eq("id", id);

    if (error) throw error;
    return res.json({ message: "Usuario desactivado" });
  } catch (err) {
    console.error("[USUARIOS] deleteUsuario error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// GET /api/usuarios/roles
async function getRoles(req, res) {
  try {
    const { data, error } = await supabase
      .from("roles")
      .select("*");

    if (error) throw error;
    return res.json({ roles: data });
  } catch (err) {
    console.error("[USUARIOS] getRoles error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

module.exports = { getUsuarios, crearUsuario, updateUsuario, deleteUsuario, getRoles };