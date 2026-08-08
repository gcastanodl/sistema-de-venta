const { supabase } = require("../lib/supabase");
const { enviarAlertaStockBajo } = require("../lib/notificaciones");

async function getInventario(req, res) {
  try {
    const { business_id, categoria_id, estado, search, es_ingrediente } = req.query;
    let query = supabase
      .from("inventario")
      .select("*, unidades_medida(nombre, abreviacion), categoria_inv:categorias_inventario(nombre, color), suplidores(nombre)")
      .eq("business_id", business_id)
      .order("nombre", { ascending: true });

    if (categoria_id) query = query.eq("categoria_inventario_id", categoria_id);
    if (search) query = query.ilike("nombre", `%${search}%`);
    if (es_ingrediente === "true") query = query.eq("es_ingrediente", true);

    const { data, error } = await query;
    if (error) throw error;

    const inventarioConEstado = data.map(item => {
      let est = "disponible";
      if (Number(item.stock_actual) <= 0) est = "agotado";
      else if (Number(item.stock_actual) <= Number(item.stock_minimo)) est = "bajo";
      return { ...item, categorias_inventario: item.categoria_inv, estado_calculado: est };
    });

    const filtrado = estado ? inventarioConEstado.filter(i => i.estado_calculado === estado) : inventarioConEstado;
    return res.json({ inventario: filtrado });
  } catch (err) {
    console.error("[INVENTARIO] getInventario:", err);
    return res.status(500).json({ message: err.message });
  }
}

async function getUnidades(req, res) {
  try {
    const { data, error } = await supabase.from("unidades_medida").select("*").order("nombre");
    if (error) throw error;
    return res.json({ unidades: data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function crearIngrediente(req, res) {
  try {
    const { business_id, nombre, sku, categoria_inventario_id, unidad_medida_id, stock_actual, stock_minimo, costo_unitario, precio_estimado, fecha_entrada, fecha_vencimiento, suplidor_id, ubicacion, notas, es_ingrediente } = req.body;
    if (!business_id || !nombre || !unidad_medida_id) return res.status(400).json({ message: "Faltan campos requeridos" });

    const { data, error } = await supabase
      .from("inventario")
      .insert([{
        business_id, nombre, sku: sku || null,
        categoria_inventario_id: categoria_inventario_id || null,
        unidad_medida_id,
        stock_actual: parseFloat(stock_actual || 0),
        stock_minimo: parseFloat(stock_minimo || 0),
        costo_unitario: parseFloat(costo_unitario || 0),
        precio_estimado: parseFloat(precio_estimado || 0),
        fecha_entrada: fecha_entrada || null,
        fecha_vencimiento: fecha_vencimiento || null,
        suplidor_id: suplidor_id || null,
        ubicacion: ubicacion || null,
        notas: notas || null,
        es_ingrediente: es_ingrediente === true || es_ingrediente === "true" ? true : false
      }])
      .select("*, unidades_medida(nombre, abreviacion), categoria_inv:categorias_inventario(nombre, color), suplidores(nombre)")
      .single();

    if (error) throw error;
    const ingrediente = { ...data, categorias_inventario: data.categoria_inv };
    return res.status(201).json({ ingrediente });
  } catch (err) {
    console.error("[INVENTARIO] crearIngrediente:", err);
    return res.status(500).json({ message: err.message });
  }
}

async function updateIngrediente(req, res) {
  try {
    const { id } = req.params;
    const { nombre, sku, categoria_inventario_id, unidad_medida_id, stock_actual, stock_minimo, costo_unitario, precio_estimado, fecha_entrada, fecha_vencimiento, suplidor_id, ubicacion, notas, es_ingrediente } = req.body;

    const { data, error } = await supabase
      .from("inventario")
      .update({
        nombre, sku: sku || null,
        categoria_inventario_id: categoria_inventario_id || null,
        unidad_medida_id,
        stock_actual: parseFloat(stock_actual),
        stock_minimo: parseFloat(stock_minimo),
        costo_unitario: parseFloat(costo_unitario),
        precio_estimado: parseFloat(precio_estimado || 0),
        fecha_entrada: fecha_entrada || null,
        fecha_vencimiento: fecha_vencimiento || null,
        suplidor_id: suplidor_id || null,
        ubicacion: ubicacion || null,
        notas: notas || null,
        es_ingrediente: es_ingrediente === true || es_ingrediente === "true" ? true : false
      })
      .eq("id", id)
      .select("*, unidades_medida(nombre, abreviacion), categoria_inv:categorias_inventario(nombre, color), suplidores(nombre)")
      .single();

    if (error) throw error;
    const ingrediente = { ...data, categorias_inventario: data.categoria_inv };
    return res.json({ ingrediente });
  } catch (err) {
    console.error("[INVENTARIO] updateIngrediente:", err);
    return res.status(500).json({ message: err.message });
  }
}

async function ajustarStock(req, res) {
  try {
    const { id } = req.params;
    const { cantidad, tipo, notas, usuario_id } = req.body;

    const { data: item } = await supabase.from("inventario").select("stock_actual, stock_minimo, business_id").eq("id", id).single();
    const nuevoStock = tipo === "ajuste" ? parseFloat(cantidad) : Number(item.stock_actual) + parseFloat(cantidad);

    console.log("[AJUSTE] nuevoStock:", nuevoStock, "stock_minimo:", item.stock_minimo, "condicion:", nuevoStock <= Number(item.stock_minimo));

    const { data, error } = await supabase
      .from("inventario")
      .update({ stock_actual: nuevoStock })
      .eq("id", id)
      .select("*, unidades_medida(nombre, abreviacion), categoria_inv:categorias_inventario(nombre, color), suplidores(nombre)")
      .single();

    if (error) throw error;

    await supabase.from("movimientos_inventario").insert([{
      inventario_id: id, tipo: tipo || "ajuste",
      cantidad: parseFloat(cantidad), notas, usuario_id
    }]);

    if (nuevoStock <= Number(item.stock_minimo)) {
      console.log("[AJUSTE] Stock bajo detectado, buscando negocio...");
      const { data: negocio } = await supabase
        .from("businesses")
        .select("nombre, email")
        .eq("id", item.business_id)
        .single();

      console.log("[AJUSTE] Negocio encontrado:", negocio);

      if (negocio?.email) {
        const itemConEstado = {
          ...data,
          estado_calculado: nuevoStock <= 0 ? "agotado" : "bajo",
          categorias_inventario: data.categoria_inv,
        };
        await enviarAlertaStockBajo([itemConEstado], negocio);
      }
    }

    const ingrediente = { ...data, categorias_inventario: data.categoria_inv };
    return res.json({ ingrediente });
  } catch (err) {
    console.error("[INVENTARIO] ajustarStock:", err);
    return res.status(500).json({ message: err.message });
  }
}

async function getMovimientos(req, res) {
  try {
    const { inventario_id } = req.query;
    const { data, error } = await supabase
      .from("movimientos_inventario")
      .select("*, users(nombre, apellido)")
      .eq("inventario_id", inventario_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return res.json({ movimientos: data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function getStockBajo(req, res) {
  try {
    const { business_id } = req.query;
    const { data, error } = await supabase
      .from("inventario")
      .select("*, unidades_medida(nombre, abreviacion), categoria_inv:categorias_inventario(nombre)")
      .eq("business_id", business_id);

    if (error) throw error;
    const stockBajo = data.filter(i => Number(i.stock_actual) <= Number(i.stock_minimo));
    return res.json({ items: stockBajo, count: stockBajo.length });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function eliminarIngrediente(req, res) {
  try {
    const { id } = req.params;
    await supabase.from("movimientos_inventario").delete().eq("inventario_id", id);
    await supabase.from("recetas").delete().eq("inventario_id", id);
    await supabase.from("inventario").delete().eq("id", id);
    return res.json({ message: "Item eliminado" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function crearUnidad(req, res) {
  try {
    const { nombre, abreviacion } = req.body;
    if (!nombre || !abreviacion) return res.status(400).json({ message: "Faltan campos" });
    const { data, error } = await supabase.from("unidades_medida").insert([{ nombre, abreviacion }]).select().single();
    if (error) throw error;
    return res.status(201).json({ unidad: data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function eliminarUnidad(req, res) {
  try {
    const { id } = req.params;
    await supabase.from("unidades_medida").delete().eq("id", id);
    return res.json({ message: "Unidad eliminada" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = { getInventario, getUnidades, crearIngrediente, updateIngrediente, ajustarStock, getMovimientos, getStockBajo, eliminarIngrediente, crearUnidad, eliminarUnidad };