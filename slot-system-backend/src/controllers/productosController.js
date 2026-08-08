const { supabase } = require("../lib/supabase");

async function getProductos(req, res) {
  try {
    const { business_id } = req.query;
    const { data, error } = await supabase
      .from("productos")
      .select("*, categorias(nombre, color)")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json({ productos: data });
  } catch (err) {
    console.error("[PRODUCTOS] error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function crearProducto(req, res) {
  try {
    const { business_id, categoria_id, nombre, descripcion, precio, costo_estimado, itbis, disponible, kitchen_station, tiempo_preparacion, inventario_id, cantidad_consumida } = req.body;

    if (!business_id || !nombre || !precio) {
      return res.status(400).json({ message: "Faltan campos requeridos" });
    }

    const { data, error } = await supabase
      .from("productos")
      .insert([{
        business_id, categoria_id, nombre, descripcion,
        precio: parseFloat(precio),
        costo_estimado: costo_estimado ? parseFloat(costo_estimado) : null,
        itbis: itbis !== undefined ? itbis : true,
        disponible: disponible !== undefined ? disponible : true,
        kitchen_station: kitchen_station || "cocina",
        tiempo_preparacion: tiempo_preparacion || 0,
        inventario_id: inventario_id || null,
        cantidad_consumida: cantidad_consumida ? parseFloat(cantidad_consumida) : 1
      }])
      .select("*, categorias(nombre, color)")
      .single();

    if (error) throw error;
    return res.status(201).json({ producto: data });
  } catch (err) {
    console.error("[PRODUCTOS] error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function updateProducto(req, res) {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, costo_estimado, categoria_id, itbis, disponible, kitchen_station, tiempo_preparacion, inventario_id, cantidad_consumida } = req.body;

    const { data, error } = await supabase
      .from("productos")
      .update({
        nombre, descripcion,
        precio: parseFloat(precio),
        costo_estimado: costo_estimado ? parseFloat(costo_estimado) : null,
        categoria_id, itbis, disponible,
        kitchen_station, tiempo_preparacion,
        inventario_id: inventario_id || null,
        cantidad_consumida: cantidad_consumida ? parseFloat(cantidad_consumida) : 1
      })
      .eq("id", id)
      .select("*, categorias(nombre, color)")
      .single();

    if (error) throw error;
    return res.json({ producto: data });
  } catch (err) {
    console.error("[PRODUCTOS] error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function toggleDisponible(req, res) {
  try {
    const { id } = req.params;
    const { data: prod } = await supabase.from("productos").select("disponible").eq("id", id).single();

    const { data, error } = await supabase
      .from("productos")
      .update({ disponible: !prod.disponible })
      .eq("id", id)
      .select("*, categorias(nombre, color)")
      .single();

    if (error) throw error;
    return res.json({ producto: data });
  } catch (err) {
    console.error("[PRODUCTOS] error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function deleteProducto(req, res) {
  try {
    const { id } = req.params;

    // Verificar si tiene orden_items asociados
    const { data: items } = await supabase
      .from("orden_items")
      .select("id")
      .eq("producto_id", id)
      .limit(1);

    if (items && items.length > 0) {
      return res.status(400).json({ message: "No se puede eliminar — el producto tiene ventas registradas. Deshabilitalo en su lugar." });
    }

    // Limpiar recetas primero
    await supabase.from("recetas").delete().eq("producto_id", id);

    const { error } = await supabase.from("productos").delete().eq("id", id);
    if (error) throw error;
    return res.json({ message: "Producto eliminado" });
  } catch (err) {
    console.error("[PRODUCTOS] deleteProducto error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

module.exports = { getProductos, crearProducto, updateProducto, toggleDisponible, deleteProducto };