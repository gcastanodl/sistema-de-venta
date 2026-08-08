const { supabase } = require("../lib/supabase");

async function getClientes(req, res) {
  try {
    const { business_id } = req.query;
    const { data, error } = await supabase.from("clientes").select("*").eq("business_id", business_id).order("nombre");
    if (error) throw error;
    return res.json({ clientes: data });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
}

async function crearCliente(req, res) {
  try {
    const { business_id, nombre, telefono, email } = req.body;
    if (!business_id || !nombre) return res.status(400).json({ message: "Faltan campos requeridos" });
    const { data, error } = await supabase.from("clientes").insert([{ business_id, nombre, telefono, email }]).select().single();
    if (error) throw error;
    return res.status(201).json({ cliente: data });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
}

async function updateCliente(req, res) {
  try {
    const { id } = req.params;
    const { nombre, telefono, email } = req.body;
    const { data, error } = await supabase.from("clientes").update({ nombre, telefono, email }).eq("id", id).select().single();
    if (error) throw error;
    return res.json({ cliente: data });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
}

module.exports = { getClientes, crearCliente, updateCliente };