const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { supabase } = require("../lib/supabase");

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Correo y contraseña requeridos" });
    }

    const { data: admin, error } = await supabase
      .from("super_admins")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .eq("estado", "activo")
      .single();

    if (error || !admin) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, rol: "superadmin" },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    const { password_hash, ...adminSafe } = admin;
    return res.json({ token, admin: adminSafe });

  } catch (err) {
    console.error("[SUPERADMIN] login error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function getNegocios(req, res) {
  try {
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json({ negocios: data });

  } catch (err) {
    console.error("[SUPERADMIN] getNegocios error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function crearNegocio(req, res) {
  try {
    const { nombre, rnc, telefono, email, direccion, moneda, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ message: "Nombre, email y contraseña son requeridos" });
    }

    // 1. Crear el negocio
    const { data: negocio, error: negocioError } = await supabase
      .from("businesses")
      .insert([{
        nombre, rnc, telefono, email, direccion,
        moneda: moneda || "DOP",
        estado: "activo"
      }])
      .select()
      .single();

    if (negocioError) throw negocioError;

    // 2. Buscar rol admin
    const { data: rol } = await supabase
      .from("roles")
      .select("id")
      .eq("nombre", "admin")
      .single();

    // 3. Crear sucursal principal
    const { data: sucursal } = await supabase
      .from("sucursales")
      .insert([{
        business_id: negocio.id,
        nombre: "Principal",
        direccion: direccion || "",
        telefono: telefono || "",
        estado: "activo"
      }])
      .select()
      .single();

    // 4. Hashear contraseña y crear usuario admin
    const password_hash = await bcrypt.hash(password, 10);
    await supabase.from("users").insert([{
      business_id: negocio.id,
      sucursal_id: sucursal?.id || null,
      nombre: "Admin",
      apellido: negocio.nombre,
      email: email.toLowerCase().trim(),
      password_hash,
      rol_id: rol?.id || null,
      estado: "activo"
    }]);

    // 5. Crear caja por defecto
    await supabase.from("cajas").insert([{
      sucursal_id: sucursal?.id || null,
      nombre: "Caja Principal",
      codigo: "CAJA-01",
      estado: "activa"
    }]);

    return res.status(201).json({ negocio });

  } catch (err) {
    console.error("[SUPERADMIN] crearNegocio error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function toggleNegocio(req, res) {
  try {
    const { id } = req.params;

    const { data: negocio } = await supabase
      .from("businesses")
      .select("estado")
      .eq("id", id)
      .single();

    const nuevoEstado = negocio.estado === "activo" ? "inactivo" : "activo";

    const { data, error } = await supabase
      .from("businesses")
      .update({ estado: nuevoEstado })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ negocio: data });

  } catch (err) {
    console.error("[SUPERADMIN] toggleNegocio error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

module.exports = { login, getNegocios, crearNegocio, toggleNegocio };