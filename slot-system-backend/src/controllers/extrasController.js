const { supabase } = require("../lib/supabase");

async function getExtras(req, res) {
  try {
    const { business_id } = req.query;
    const { data, error } = await supabase
      .from("extras")
      .select("*, inventario(nombre), unidades_medida(nombre, abreviacion)")
      .eq("business_id", business_id)
      .order("nombre");
    if (error) throw error;
    return res.json({ extras: data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function crearExtra(req, res) {
  try {
    const { business_id, nombre, precio_extra, inventario_id, cantidad_consumida, unidad_medida_id, notas } = req.body;
    if (!business_id || !nombre || precio_extra === undefined) return res.status(400).json({ message: "Faltan campos requeridos" });
    const { data, error } = await supabase
      .from("extras")
      .insert([{
        business_id, nombre,
        precio_extra: parseFloat(precio_extra),
        inventario_id: inventario_id || null,
        cantidad_consumida: parseFloat(cantidad_consumida || 0),
        unidad_medida_id: unidad_medida_id || null,
        notas: notas || null,
        disponible: true
      }])
      .select("*, inventario(nombre), unidades_medida(nombre, abreviacion)")
      .single();
    if (error) throw error;
    return res.status(201).json({ extra: data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function updateExtra(req, res) {
  try {
    const { id } = req.params;
    const { nombre, precio_extra, inventario_id, cantidad_consumida, unidad_medida_id, notas, disponible } = req.body;
    const { data, error } = await supabase
      .from("extras")
      .update({
        nombre,
        precio_extra: parseFloat(precio_extra),
        inventario_id: inventario_id || null,
        cantidad_consumida: parseFloat(cantidad_consumida || 0),
        unidad_medida_id: unidad_medida_id || null,
        notas: notas || null,
        disponible: disponible !== undefined ? disponible : true
      })
      .eq("id", id)
      .select("*, inventario(nombre), unidades_medida(nombre, abreviacion)")
      .single();
    if (error) throw error;
    return res.json({ extra: data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function eliminarExtra(req, res) {
  try {
    const { id } = req.params;
    await supabase.from("extras").delete().eq("id", id);
    return res.json({ message: "Extra eliminado" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = { getExtras, crearExtra, updateExtra, eliminarExtra };