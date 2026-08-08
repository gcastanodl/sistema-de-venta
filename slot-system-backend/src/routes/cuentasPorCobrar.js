const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const { supabase } = require("../lib/supabase");

// GET /api/cuentas-por-cobrar/resumen-sesion
router.get("/resumen-sesion", authMiddleware, async (req, res) => {
  try {
    const { sesion_id } = req.query;
    const { data, error } = await supabase
      .from("cuentas_por_cobrar")
      .select("*")
      .eq("sesion_id", sesion_id)
      .eq("estado", "cobrada");

    if (error) throw error;
    const cuentas = data || [];
    const totalCobrado = cuentas.reduce((acc, c) => acc + Number(c.total), 0);
    const porMetodo = {
      efectivo: cuentas.filter(c => c.metodo_pago_esperado === "efectivo").reduce((acc, c) => acc + Number(c.total), 0),
      tarjeta: cuentas.filter(c => c.metodo_pago_esperado === "tarjeta").reduce((acc, c) => acc + Number(c.total), 0),
      transferencia: cuentas.filter(c => c.metodo_pago_esperado === "transferencia").reduce((acc, c) => acc + Number(c.total), 0),
    };
    return res.json({ cuentas, total_cobrado: totalCobrado, por_metodo: porMetodo });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
});

// GET /api/cuentas-por-cobrar
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { business_id, sesion_id } = req.query;
    let query = supabase
      .from("cuentas_por_cobrar")
      .select("*")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false });
    if (sesion_id) query = query.eq("sesion_id", sesion_id);
    const { data, error } = await query;
    if (error) throw error;
    return res.json({ cuentas: data || [] });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
});

// POST /api/cuentas-por-cobrar
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { business_id, sesion_id, orden_id, nombre_cuenta, cliente_nombre, cliente_telefono, total, metodo_pago_esperado, notas } = req.body;
    await supabase.from("ordenes").update({ estado: "cuenta_por_cobrar" }).eq("id", orden_id);
    const { data, error } = await supabase
      .from("cuentas_por_cobrar")
      .insert([{ business_id, sesion_id, orden_id, nombre_cuenta, cliente_nombre, cliente_telefono, total: parseFloat(total), metodo_pago_esperado, notas, estado: "pendiente" }])
      .select()
      .single();
    if (error) throw error;
    return res.status(201).json({ cuenta: data });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
});

// PUT /api/cuentas-por-cobrar/:id/facturar
router.put("/:id/facturar", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: cxc, error } = await supabase
      .from("cuentas_por_cobrar")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !cxc) return res.status(404).json({ message: "Cuenta no encontrada" });
    await supabase.from("ordenes").update({ estado: "pendiente" }).eq("id", cxc.orden_id);
    await supabase.from("cuentas_por_cobrar").update({ estado: "en_facturacion" }).eq("id", id);
    return res.json({ orden_id: cxc.orden_id, sesion_id: cxc.sesion_id });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
});

// PUT /api/cuentas-por-cobrar/:id/cobrar
router.put("/:id/cobrar", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { metodo_pago, usuario_id } = req.body;
    const { data, error } = await supabase
      .from("cuentas_por_cobrar")
      .update({ estado: "cobrada", metodo_pago_esperado: metodo_pago, cobrado_at: new Date().toISOString(), cobrado_por: usuario_id })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return res.json({ cuenta: data });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
});

// PUT /api/cuentas-por-cobrar/cancelar-por-orden/:orden_id
router.put("/cancelar-por-orden/:orden_id", authMiddleware, async (req, res) => {
  try {
    const { orden_id } = req.params;
    await supabase
      .from("cuentas_por_cobrar")
      .update({ estado: "cancelada" })
      .eq("orden_id", orden_id)
      .in("estado", ["en_facturacion", "pendiente"]);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
});

module.exports = router;