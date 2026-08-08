const { supabase } = require("../lib/supabase");

async function getCategorias(req, res) {
  try {
    const { business_id } = req.query;
    const { data, error } = await supabase
      .from("categorias")
      .select("*")
      .eq("business_id", business_id)
      .order("orden", { ascending: true });

    if (error) throw error;
    return res.json({ categorias: data });
  } catch (err) {
    console.error("[CATEGORIAS] error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function crearCategoria(req, res) {
  try {
    const { business_id, nombre, color, orden } = req.body;
    if (!business_id || !nombre) return res.status(400).json({ message: "Faltan campos requeridos" });

    const { data, error } = await supabase
      .from("categorias")
      .insert([{ business_id, nombre, color: color || "#F59E0B", orden: orden || 0 }])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ categoria: data });
  } catch (err) {
    console.error("[CATEGORIAS] error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function updateCategoria(req, res) {
  try {
    const { id } = req.params;
    const { nombre, color, orden } = req.body;

    const { data, error } = await supabase
      .from("categorias")
      .update({ nombre, color, orden })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ categoria: data });
  } catch (err) {
    console.error("[CATEGORIAS] error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function deleteCategoria(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("categorias").delete().eq("id", id);
    if (error) throw error;
    return res.json({ message: "Categoría eliminada" });
  } catch (err) {
    console.error("[CATEGORIAS] error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

module.exports = { getCategorias, crearCategoria, updateCategoria, deleteCategoria };