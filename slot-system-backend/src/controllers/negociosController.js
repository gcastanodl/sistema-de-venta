const { supabase } = require("../lib/supabase");

async function getNegocio(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("businesses")
      .select("*, branches(*)")
      .eq("id", id)
      .single();

    if (error || !data) return res.status(404).json({ message: "Negocio no encontrado" });
    return res.json({ negocio: data });
  } catch (err) {
    console.error("[NEGOCIOS] getNegocio error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function updateNegocio(req, res) {
  try {
    const { id } = req.params;
    const { nombre, rnc, telefono, email, direccion, moneda, logo, clave_descuento, descuento_maximo } = req.body;

    const updateData = { nombre, rnc, telefono, email, direccion, moneda, logo };
    if (clave_descuento !== undefined) updateData.clave_descuento = clave_descuento;
    if (descuento_maximo !== undefined) updateData.descuento_maximo = descuento_maximo;

    const { data, error } = await supabase
      .from("businesses")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ negocio: data });
  } catch (err) {
    console.error("[NEGOCIOS] updateNegocio error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function verificarClaveDescuento(req, res) {
  try {
    const { id } = req.params;
    const { clave } = req.body;

    const { data, error } = await supabase
      .from("businesses")
      .select("clave_descuento, descuento_maximo")
      .eq("id", id)
      .single();

    if (error || !data) return res.status(404).json({ message: "Negocio no encontrado" });
    if (!data.clave_descuento) return res.status(400).json({ message: "No hay clave de descuento configurada" });
    if (data.clave_descuento !== clave) return res.status(401).json({ message: "Clave incorrecta" });

    return res.json({ valido: true, descuento_maximo: data.descuento_maximo || 100 });
  } catch (err) {
    console.error("[NEGOCIOS] verificarClaveDescuento error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

module.exports = { getNegocio, updateNegocio, verificarClaveDescuento };