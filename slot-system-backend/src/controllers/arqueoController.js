const { supabase } = require("../lib/supabase");

// GET /api/arqueo/denominaciones
async function getDenominaciones(req, res) {
  try {
    const { data, error } = await supabase
      .from("denominaciones")
      .select("*")
      .order("valor", { ascending: false });

    if (error) throw error;
    return res.json({ denominaciones: data });
  } catch (err) {
    console.error("[ARQUEO] getDenominaciones error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// POST /api/arqueo/guardar
async function guardarArqueo(req, res) {
  try {
    const { sesion_id, denominaciones } = req.body;

    if (!sesion_id || !denominaciones) {
      return res.status(400).json({ message: "Faltan campos requeridos" });
    }

    // Borrar arqueo anterior si existe
    await supabase
      .from("arqueos_caja")
      .delete()
      .eq("sesion_id", sesion_id);

    // Insertar nuevo arqueo
    const registros = denominaciones
      .filter(d => d.cantidad > 0)
      .map(d => ({
        sesion_id,
        denominacion_id: d.id,
        cantidad: d.cantidad,
        subtotal: d.cantidad * d.valor
      }));

    if (registros.length > 0) {
      const { error } = await supabase
        .from("arqueos_caja")
        .insert(registros);

      if (error) throw error;
    }

    // Calcular total
    const total = denominaciones.reduce((acc, d) => acc + (d.cantidad * d.valor), 0);

    return res.json({ total, registros });
  } catch (err) {
    console.error("[ARQUEO] guardarArqueo error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// GET /api/arqueo/resumen/:sesion_id
async function getResumen(req, res) {
  try {
    const { sesion_id } = req.params;

    // Obtener sesion
    const { data: sesion, error: sesionError } = await supabase
      .from("sesiones_caja")
      .select("*, users(nombre, apellido), cajas(nombre, codigo)")
      .eq("id", sesion_id)
      .single();

    if (sesionError) throw sesionError;

    // Obtener arqueo
    const { data: arqueo } = await supabase
      .from("arqueos_caja")
      .select("*, denominaciones(valor)")
      .eq("sesion_id", sesion_id);

    // Obtener movimientos
    const { data: movimientos } = await supabase
      .from("movimientos_caja")
      .select("*")
      .eq("sesion_id", sesion_id)
      .order("created_at", { ascending: true });

    return res.json({ sesion, arqueo: arqueo || [], movimientos: movimientos || [] });
  } catch (err) {
    console.error("[ARQUEO] getResumen error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

module.exports = { getDenominaciones, guardarArqueo, getResumen };