const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const { supabase } = require("../lib/supabase");

// ── CATEGORÍAS ──────────────────────────────────────────────

// GET /api/gastos/categorias
router.get("/categorias", authMiddleware, async (req, res) => {
  try {
    const { business_id } = req.query;
    const { data, error } = await supabase
      .from("gasto_categorias")
      .select("*")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return res.json({ categorias: data || [] });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
});

// POST /api/gastos/categorias
router.post("/categorias", authMiddleware, async (req, res) => {
  try {
    const { business_id, nombre, color } = req.body;
    const { data, error } = await supabase
      .from("gasto_categorias")
      .insert([{ business_id, nombre, color: color || "#6B7280" }])
      .select()
      .single();
    if (error) throw error;
    return res.status(201).json({ categoria: data });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
});

// DELETE /api/gastos/categorias/:id
router.delete("/categorias/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("gasto_categorias").delete().eq("id", id);
    if (error) throw error;
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
});

// ── GASTOS ──────────────────────────────────────────────────

// GET /api/gastos
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { business_id, categoria_id, fecha_inicio, fecha_fin } = req.query;
    let query = supabase
      .from("gastos")
      .select("*, gasto_categorias(nombre, color)")
      .eq("business_id", business_id)
      .order("fecha", { ascending: false });
    if (categoria_id) query = query.eq("categoria_id", categoria_id);
    if (fecha_inicio) query = query.gte("fecha", fecha_inicio);
    if (fecha_fin) query = query.lte("fecha", fecha_fin);
    const { data, error } = await query;
    if (error) throw error;
    return res.json({ gastos: data || [] });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
});

// POST /api/gastos
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { business_id, categoria_id, nombre, monto, fecha, notas } = req.body;
    if (!nombre || !monto || !fecha) return res.status(400).json({ message: "Faltan campos requeridos" });
    const { data, error } = await supabase
      .from("gastos")
      .insert([{ business_id, categoria_id: categoria_id || null, nombre, monto: parseFloat(monto), fecha, notas: notas || null }])
      .select("*, gasto_categorias(nombre, color)")
      .single();
    if (error) throw error;
    return res.status(201).json({ gasto: data });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
});

// PUT /api/gastos/:id
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { categoria_id, nombre, monto, fecha, notas } = req.body;
    const { data, error } = await supabase
      .from("gastos")
      .update({ categoria_id: categoria_id || null, nombre, monto: parseFloat(monto), fecha, notas: notas || null })
      .eq("id", id)
      .select("*, gasto_categorias(nombre, color)")
      .single();
    if (error) throw error;
    return res.json({ gasto: data });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
});

// DELETE /api/gastos/:id
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("gastos").delete().eq("id", id);
    if (error) throw error;
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: "Error interno" });
  }
});

module.exports = router;