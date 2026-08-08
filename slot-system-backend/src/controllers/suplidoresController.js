const { supabase } = require("../lib/supabase");

async function getSuplidores(req, res) {
  try {
    const { business_id } = req.query;
    const { data, error } = await supabase.from("suplidores").select("*").eq("business_id", business_id).order("nombre");
    if (error) throw error;
    return res.json({ suplidores: data });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
}

async function crearSuplidor(req, res) {
  try {
    const { business_id, nombre, telefono, email, direccion, notas } = req.body;
    if (!business_id || !nombre) return res.status(400).json({ message: "Faltan campos requeridos" });
    const { data, error } = await supabase.from("suplidores").insert([{ business_id, nombre, telefono, email, direccion, notas }]).select().single();
    if (error) throw error;
    return res.status(201).json({ suplidor: data });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
}

async function updateSuplidor(req, res) {
  try {
    const { id } = req.params;
    const { nombre, telefono, email, direccion, notas } = req.body;
    const { data, error } = await supabase.from("suplidores").update({ nombre, telefono, email, direccion, notas }).eq("id", id).select().single();
    if (error) throw error;
    return res.json({ suplidor: data });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
}

async function deleteSuplidor(req, res) {
  try {
    const { id } = req.params;
    await supabase.from("suplidores").delete().eq("id", id);
    return res.json({ message: "Suplidor eliminado" });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
}

module.exports = { getSuplidores, crearSuplidor, updateSuplidor, deleteSuplidor };