const { supabase } = require("../lib/supabase");

async function getCategorias(req, res) {
  try {
    const { business_id } = req.query;
    const { data, error } = await supabase.from("categorias_inventario").select("*").eq("business_id", business_id).order("nombre");
    if (error) throw error;
    return res.json({ categorias: data });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
}

async function crearCategoria(req, res) {
  try {
    const { business_id, nombre, color } = req.body;
    if (!business_id || !nombre) return res.status(400).json({ message: "Faltan campos requeridos" });
    const { data, error } = await supabase.from("categorias_inventario").insert([{ business_id, nombre, color: color || "#6366F1" }]).select().single();
    if (error) throw error;
    return res.status(201).json({ categoria: data });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
}

async function updateCategoria(req, res) {
  try {
    const { id } = req.params;
    const { nombre, color } = req.body;
    const { data, error } = await supabase.from("categorias_inventario").update({ nombre, color }).eq("id", id).select().single();
    if (error) throw error;
    return res.json({ categoria: data });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
}

async function deleteCategoria(req, res) {
  try {
    const { id } = req.params;
    await supabase.from("categorias_inventario").delete().eq("id", id);
    return res.json({ message: "Categoría eliminada" });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
}

module.exports = { getCategorias, crearCategoria, updateCategoria, deleteCategoria };