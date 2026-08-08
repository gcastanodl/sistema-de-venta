const { supabase } = require("../lib/supabase");

// GET /api/sucursales?business_id=xxx
async function getSucursales(req, res) {
  try {
    const { business_id } = req.query;

    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .eq("business_id", business_id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return res.json({ sucursales: data });
  } catch (err) {
    console.error("[SUCURSALES] getSucursales error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// POST /api/sucursales
async function crearSucursal(req, res) {
  try {
    const { business_id, nombre, direccion, telefono } = req.body;

    if (!business_id || !nombre) {
      return res.status(400).json({ message: "Business ID y nombre son requeridos" });
    }

    const { data, error } = await supabase
      .from("branches")
      .insert([{ business_id, nombre, direccion, telefono }])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ sucursal: data });
  } catch (err) {
    console.error("[SUCURSALES] crearSucursal error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// PUT /api/sucursales/:id
async function updateSucursal(req, res) {
  try {
    const { id } = req.params;
    const { nombre, direccion, telefono } = req.body;

    const { data, error } = await supabase
      .from("branches")
      .update({ nombre, direccion, telefono })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ sucursal: data });
  } catch (err) {
    console.error("[SUCURSALES] updateSucursal error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// DELETE /api/sucursales/:id
async function deleteSucursal(req, res) {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("branches")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return res.json({ message: "Sucursal eliminada" });
  } catch (err) {
    console.error("[SUCURSALES] deleteSucursal error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

module.exports = { getSucursales, crearSucursal, updateSucursal, deleteSucursal };