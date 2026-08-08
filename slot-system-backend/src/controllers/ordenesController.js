const { supabase } = require("../lib/supabase");

async function crearOrden(req, res) {
  try {
    const { sesion_id, usuario_id, items, subtotal, itbis, total, metodo_pago, tipo_orden, cliente_id, nombre_cuenta, cliente_nombre, cliente_telefono } = req.body;

    if (!sesion_id || !usuario_id) {
      return res.status(400).json({ message: "Faltan campos requeridos" });
    }

    const { count } = await supabase
      .from("ordenes")
      .select("*", { count: "exact", head: true })
      .eq("sesion_id", sesion_id);

    const numero_cuenta = (count || 0) + 1;

    const { data: orden, error: ordenError } = await supabase
      .from("ordenes")
      .insert([{
        sesion_id, usuario_id, cliente_id: cliente_id || null,
        subtotal: parseFloat(subtotal || 0), itbis: parseFloat(itbis || 0),
        descuento: 0, total: parseFloat(total || 0), estado: "pendiente",
        tipo_orden: tipo_orden || "dine-in", metodo_pago: metodo_pago || null,
        nombre_cuenta: nombre_cuenta || `Cuenta ${numero_cuenta}`, numero_cuenta,
        cliente_nombre: cliente_nombre || null,
        cliente_telefono: cliente_telefono || null
      }])
      .select().single();

    if (ordenError) throw ordenError;

    if (items && items.length > 0) {
      const ordenItems = items.map(item => ({
        orden_id: orden.id, producto_id: item.producto_id,
        cantidad: item.cantidad, precio: item.precio, notas: item.notas || null
      }));
      await supabase.from("orden_items").insert(ordenItems);
    }

    return res.status(201).json({ orden });
  } catch (err) {
    console.error("[ORDENES] crearOrden error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function agregarItems(req, res) {
  try {
    const { id } = req.params;
    const { items } = req.body;

    if (!items || items.length === 0) return res.status(400).json({ message: "No hay items para agregar" });

    const ordenItems = items.map(item => ({
      orden_id: id, producto_id: item.producto_id,
      cantidad: item.cantidad, precio: item.precio, notas: item.notas || null,
      es_extra: item.es_extra || false, extra_id: item.extra_id || null
    }));

    const { error } = await supabase.from("orden_items").insert(ordenItems);
    if (error) throw error;

    const { data: allItems } = await supabase
      .from("orden_items").select("*, productos(itbis)").eq("orden_id", id);

    const subtotal = allItems.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const itbis = allItems.reduce((acc, item) => item.productos?.itbis ? acc + (item.precio * item.cantidad * 0.18) : acc, 0);
    const total = subtotal + itbis;

    const { data: orden, error: updateError } = await supabase
      .from("ordenes").update({ subtotal, itbis, total }).eq("id", id).select().single();

    if (updateError) throw updateError;
    return res.json({ orden });
  } catch (err) {
    console.error("[ORDENES] agregarItems error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function cobrarOrden(req, res) {
  try {
    const { id } = req.params;
    const { metodo_pago, usuario_id, sesion_id, monto_recibido } = req.body;

    const { data: ordenActual } = await supabase
      .from("ordenes")
      .select("total, nombre_cuenta, orden_items(producto_id, cantidad)")
      .eq("id", id).single();

    const vuelto = metodo_pago === "efectivo"
      ? parseFloat(monto_recibido) - parseFloat(ordenActual.total) : 0;

    const { data: orden, error: ordenError } = await supabase
      .from("ordenes")
      .update({ estado: "completada", metodo_pago, monto_recibido: parseFloat(monto_recibido), vuelto: vuelto < 0 ? 0 : vuelto })
      .eq("id", id)
      .select("*, orden_items(*, productos(nombre, itbis))")
      .single();

    if (ordenError) throw ordenError;

    await supabase.from("movimientos_caja").insert([{
      sesion_id, tipo: "venta", monto: parseFloat(ordenActual.total),
      metodo_pago, referencia: id, usuario_id,
      notas: `Venta - ${ordenActual.nombre_cuenta}`
    }]);

    for (const item of ordenActual.orden_items || []) {
      if (!item.producto_id) continue;

      const { data: recetas } = await supabase
        .from("recetas")
        .select("inventario_id, cantidad")
        .eq("producto_id", item.producto_id);

      for (const receta of recetas || []) {
        const cantidadDescontar = receta.cantidad * item.cantidad;
        const { data: ing } = await supabase
          .from("inventario").select("stock_actual").eq("id", receta.inventario_id).single();
        const nuevoStock = Math.max(0, Number(ing.stock_actual) - cantidadDescontar);
        await supabase.from("inventario").update({ stock_actual: nuevoStock }).eq("id", receta.inventario_id);
        await supabase.from("movimientos_inventario").insert([{
          inventario_id: receta.inventario_id, tipo: "venta",
          cantidad: cantidadDescontar, referencia: id, usuario_id,
          notas: `Venta - ${ordenActual.nombre_cuenta}`
        }]);
      }

      const { data: producto } = await supabase
        .from("productos")
        .select("inventario_id, cantidad_consumida")
        .eq("id", item.producto_id)
        .single();

      if (producto?.inventario_id) {
        const cantidadDescontar = Number(producto.cantidad_consumida || 1) * item.cantidad;
        const { data: inv } = await supabase
          .from("inventario").select("stock_actual").eq("id", producto.inventario_id).single();
        const nuevoStock = Math.max(0, Number(inv.stock_actual) - cantidadDescontar);
        await supabase.from("inventario").update({ stock_actual: nuevoStock }).eq("id", producto.inventario_id);
        await supabase.from("movimientos_inventario").insert([{
          inventario_id: producto.inventario_id, tipo: "venta",
          cantidad: cantidadDescontar, referencia: id, usuario_id,
          notas: `Venta directa - ${ordenActual.nombre_cuenta}`
        }]);
      }
    }

    return res.json({ orden, vuelto: vuelto < 0 ? 0 : vuelto });
  } catch (err) {
    console.error("[ORDENES] cobrarOrden error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function getOrdenesActivas(req, res) {
  try {
    const { sesion_id } = req.query;
    const { data, error } = await supabase
      .from("ordenes")
      .select("*, orden_items(*, productos(nombre, itbis))")
      .eq("sesion_id", sesion_id)
      .eq("estado", "pendiente")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return res.json({ ordenes: data });
  } catch (err) {
    console.error("[ORDENES] getOrdenesActivas error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function getOrdenes(req, res) {
  try {
    const { sesion_id } = req.query;
    let query = supabase
      .from("ordenes")
      .select("*, users(nombre, apellido), orden_items(*, productos(nombre))")
      .order("created_at", { ascending: false });

    if (sesion_id) query = query.eq("sesion_id", sesion_id);

    const { data, error } = await query;
    if (error) throw error;
    return res.json({ ordenes: data });
  } catch (err) {
    console.error("[ORDENES] getOrdenes error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function getOrden(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("ordenes")
      .select("*, users(nombre, apellido), orden_items(*, productos(nombre, precio, itbis))")
      .eq("id", id)
      .single();

    if (error) throw error;
    return res.json({ orden: data });
  } catch (err) {
    console.error("[ORDENES] getOrden error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function emitirComanda(req, res) {
  try {
    const { id } = req.params;

    const { data: items, error } = await supabase
      .from("orden_items")
      .select("*, productos(nombre, kitchen_station, tiempo_preparacion)")
      .eq("orden_id", id)
      .eq("enviado_a_cocina", false);

    if (error) throw error;

    if (items.length === 0) {
      return res.status(400).json({ message: "No hay items nuevos para enviar a cocina" });
    }

    await supabase
      .from("orden_items")
      .update({ enviado_a_cocina: true })
      .eq("orden_id", id)
      .eq("enviado_a_cocina", false);

    const { data: orden } = await supabase
      .from("ordenes")
      .select("nombre_cuenta, cliente_nombre, cliente_telefono, created_at")
      .eq("id", id)
      .single();

    return res.json({ items, orden });
  } catch (err) {
    console.error("[ORDENES] emitirComanda error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function eliminarOrden(req, res) {
  try {
    const { id } = req.params;
    await supabase.from("orden_items").delete().eq("orden_id", id);
    await supabase.from("ordenes").delete().eq("id", id);
    return res.json({ message: "Cuenta eliminada" });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
}

async function eliminarItem(req, res) {
  try {
    const { item_id } = req.params;
    await supabase.from("orden_items").delete().eq("id", item_id);
    return res.json({ message: "Item eliminado" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = { crearOrden, agregarItems, cobrarOrden, getOrdenesActivas, getOrdenes, getOrden, emitirComanda, eliminarOrden, eliminarItem };