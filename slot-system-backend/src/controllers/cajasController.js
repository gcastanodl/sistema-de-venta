const { supabase } = require("../lib/supabase");

async function getCajas(req, res) {
  try {
    const { sucursal_id } = req.query;
    const { data, error } = await supabase
      .from("cajas")
      .select("*")
      .eq("sucursal_id", sucursal_id)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return res.json({ cajas: data });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
}

async function crearCaja(req, res) {
  try {
    const { sucursal_id, nombre, codigo } = req.body;
    if (!sucursal_id || !nombre || !codigo) {
      return res.status(400).json({ message: "Faltan campos requeridos" });
    }
    const { data, error } = await supabase
      .from("cajas")
      .insert([{ sucursal_id, nombre, codigo, estado: "activa" }])
      .select()
      .single();
    if (error) throw error;
    return res.status(201).json({ caja: data });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
}

async function getSesionActiva(req, res) {
  try {
    const { caja_id } = req.query;
    const { data, error } = await supabase
      .from("sesiones_caja")
      .select("*, users(nombre, apellido), cajas(nombre)")
      .eq("caja_id", caja_id)
      .eq("estado", "abierta")
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return res.json({ sesion: data || null });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
}

async function abrirCaja(req, res) {
  try {
    const { caja_id, usuario_id, monto_apertura } = req.body;
    if (!caja_id || !usuario_id || monto_apertura === undefined) {
      return res.status(400).json({ message: "Faltan campos requeridos" });
    }

    const { data: sesionExistente } = await supabase
      .from("sesiones_caja")
      .select("id")
      .eq("caja_id", caja_id)
      .eq("estado", "abierta")
      .single();

    if (sesionExistente) {
      return res.status(400).json({ message: "Esta caja ya tiene una sesión abierta" });
    }

    const { data, error } = await supabase
      .from("sesiones_caja")
      .insert([{
        caja_id, usuario_id, monto_apertura,
        estado: "abierta",
        fecha_apertura: new Date().toISOString()
      }])
      .select("*, cajas(nombre)")
      .single();

    if (error) throw error;

    await supabase.from("movimientos_caja").insert([{
      sesion_id: data.id, tipo: "apertura",
      monto: monto_apertura, usuario_id, notas: "Apertura de caja"
    }]);

    return res.status(201).json({ sesion: data });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
}

async function cerrarCaja(req, res) {
  try {
    const { sesion_id, monto_cierre_real, usuario_id, monto_efectivo, monto_tarjeta, monto_transferencia } = req.body;

    if (!sesion_id || monto_cierre_real === undefined) {
      return res.status(400).json({ message: "Faltan campos requeridos" });
    }

    // Obtener sesión para el monto de apertura
    const { data: sesion } = await supabase
      .from("sesiones_caja")
      .select("monto_apertura")
      .eq("id", sesion_id)
      .single();

    const montoApertura = Number(sesion?.monto_apertura || 0);

    // Obtener ventas reales de la sesión por método de pago
    const { data: ordenes } = await supabase
      .from("ordenes")
      .select("total, metodo_pago")
      .eq("sesion_id", sesion_id)
      .eq("estado", "completada");

    const ventasEfectivo = (ordenes || []).filter(o => o.metodo_pago === "efectivo").reduce((acc, o) => acc + Number(o.total), 0);
    const ventasTarjeta = (ordenes || []).filter(o => o.metodo_pago === "tarjeta").reduce((acc, o) => acc + Number(o.total), 0);
    const ventasTransferencia = (ordenes || []).filter(o => o.metodo_pago === "transferencia").reduce((acc, o) => acc + Number(o.total), 0);

    // Efectivo esperado = apertura + ventas en efectivo
    const efectivoEsperado = montoApertura + ventasEfectivo;

    const efectivoContado = monto_efectivo !== undefined ? Number(monto_efectivo) : monto_cierre_real;
    const tarjetaContada = monto_tarjeta !== undefined ? Number(monto_tarjeta) : 0;
    const transferenciaContada = monto_transferencia !== undefined ? Number(monto_transferencia) : 0;

    // Descuadre = lo contado vs lo esperado (apertura + ventas efectivo)
    const descuadreEfectivo = efectivoContado - efectivoEsperado;
    const descuadreTarjeta = tarjetaContada - ventasTarjeta;
    const descuadreTransferencia = transferenciaContada - ventasTransferencia;

    const updateData = {
      estado: "cerrada",
      fecha_cierre: new Date().toISOString(),
      monto_cierre_real,
      monto_cierre_esperado: efectivoEsperado + ventasTarjeta + ventasTransferencia,
      diferencia: descuadreEfectivo,
    };

    const { data, error } = await supabase
      .from("sesiones_caja")
      .update(updateData)
      .eq("id", sesion_id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from("movimientos_caja").insert([{
      sesion_id, tipo: "cierre", monto: monto_cierre_real, usuario_id,
      notas: `Apertura: ${montoApertura}. Ventas efectivo: ${ventasEfectivo}. Esperado: ${efectivoEsperado}. Contado: ${efectivoContado}. Descuadre: ${descuadreEfectivo}. Tarjeta: ${tarjetaContada}. Transferencia: ${transferenciaContada}`
    }]);

    return res.json({
      sesion: data,
      resumen: {
        monto_apertura: montoApertura,
        ventas_efectivo: ventasEfectivo,
        efectivo_esperado: efectivoEsperado,
        efectivo_contado: efectivoContado,
        descuadre_efectivo: descuadreEfectivo,
        ventas_tarjeta: ventasTarjeta,
        tarjeta_contada: tarjetaContada,
        descuadre_tarjeta: descuadreTarjeta,
        ventas_transferencia: ventasTransferencia,
        transferencia_contada: transferenciaContada,
        descuadre_transferencia: descuadreTransferencia,
      }
    });
  } catch (err) {
    console.error("[CAJAS] cerrarCaja error:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function getSesiones(req, res) {
  try {
    const { caja_id } = req.query;
    const { data, error } = await supabase
      .from("sesiones_caja")
      .select("*, users(nombre, apellido)")
      .eq("caja_id", caja_id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return res.json({ sesiones: data });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
}

module.exports = { getCajas, crearCaja, getSesionActiva, abrirCaja, cerrarCaja, getSesiones };