const { supabase } = require("../lib/supabase");

async function getRecetas(req, res) {
  try {
    const { producto_id } = req.query;
    const { data, error } = await supabase
      .from("recetas")
      .select("*, inventario(nombre, stock_actual, unidades_medida(nombre, abreviacion)), unidades_medida(nombre, abreviacion)")
      .eq("producto_id", producto_id);
    if (error) throw error;
    return res.json({ recetas: data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function crearReceta(req, res) {
  try {
    const { producto_id, inventario_id, cantidad, unidad_medida_id } = req.body;
    if (!producto_id || !inventario_id || !cantidad) return res.status(400).json({ message: "Faltan campos requeridos" });
    const { data, error } = await supabase
      .from("recetas")
      .insert([{ producto_id, inventario_id, cantidad: parseFloat(cantidad), unidad_medida_id }])
      .select("*, inventario(nombre, stock_actual, unidades_medida(nombre, abreviacion)), unidades_medida(nombre, abreviacion)")
      .single();
    if (error) throw error;
    return res.status(201).json({ receta: data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function eliminarReceta(req, res) {
  try {
    const { id } = req.params;
    await supabase.from("recetas").delete().eq("id", id);
    return res.json({ message: "Receta eliminada" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function descontarInventarioPorVenta(orden_items) {
  try {
    for (const item of orden_items) {
      const { data: recetas } = await supabase
        .from("recetas")
        .select("inventario_id, cantidad")
        .eq("producto_id", item.producto_id);

      if (!recetas || recetas.length === 0) continue;

      for (const receta of recetas) {
        const cantidadDescontar = receta.cantidad * item.cantidad;
        const { data: ingrediente } = await supabase
          .from("inventario")
          .select("stock_actual")
          .eq("id", receta.inventario_id)
          .single();

        if (!ingrediente) continue;

        const nuevoStock = Number(ingrediente.stock_actual) - cantidadDescontar;
        await supabase.from("inventario").update({ stock_actual: nuevoStock }).eq("id", receta.inventario_id);
        await supabase.from("movimientos_inventario").insert([{
          inventario_id: receta.inventario_id,
          tipo: "venta",
          cantidad: cantidadDescontar,
          notas: "Venta automática"
        }]);
      }
    }
    return true;
  } catch (err) {
    console.error("[RECETAS] Error descontando inventario:", err);
    return false;
  }
}

module.exports = { getRecetas, crearReceta, eliminarReceta, descontarInventarioPorVenta };