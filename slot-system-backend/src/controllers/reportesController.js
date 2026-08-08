const { supabase } = require("../lib/supabase");

async function getResumenDia(req, res) {
  try {
    const { business_id, fecha } = req.query;
    const fechaInicio = fecha ? `${fecha}T00:00:00` : new Date().toISOString().split("T")[0] + "T00:00:00";
    const fechaFin = fecha ? `${fecha}T23:59:59` : new Date().toISOString().split("T")[0] + "T23:59:59";

    const { data: sucursales } = await supabase.from("branches").select("id").eq("business_id", business_id);
    const { data: cajas } = await supabase.from("cajas").select("id").in("sucursal_id", (sucursales || []).map(s => s.id));

    const { data: sesiones } = await supabase
      .from("sesiones_caja")
      .select("id")
      .in("caja_id", (cajas || []).map(c => c.id))
      .gte("fecha_apertura", fechaInicio)
      .lte("fecha_apertura", fechaFin);

    if (!sesiones || sesiones.length === 0) {
      return res.json({ total_ventas: 0, cantidad_facturas: 0, total_efectivo: 0, total_tarjeta: 0, total_transferencia: 0, total_itbis: 0, cxc_cobradas: 0, cxc_cantidad: 0 });
    }

    const sesionIds = sesiones.map(s => s.id);

    const { data: ordenes } = await supabase
      .from("ordenes")
      .select("total, itbis, metodo_pago")
      .eq("estado", "completada")
      .in("sesion_id", sesionIds);

    const { data: cxc } = await supabase
      .from("cuentas_por_cobrar")
      .select("total, metodo_pago_esperado")
      .eq("estado", "cobrada")
      .in("sesion_id", sesionIds);

    const totalVentas = (ordenes || []).reduce((acc, o) => acc + Number(o.total), 0);
    const totalEfectivo = (ordenes || []).filter(o => o.metodo_pago === "efectivo").reduce((acc, o) => acc + Number(o.total), 0);
    const totalTarjeta = (ordenes || []).filter(o => o.metodo_pago === "tarjeta").reduce((acc, o) => acc + Number(o.total), 0);
    const totalTransferencia = (ordenes || []).filter(o => o.metodo_pago === "transferencia").reduce((acc, o) => acc + Number(o.total), 0);
    const totalItbis = (ordenes || []).reduce((acc, o) => acc + Number(o.itbis || 0), 0);

    const cxcCobradas = (cxc || []).reduce((acc, c) => acc + Number(c.total), 0);
    const cxcEfectivo = (cxc || []).filter(c => c.metodo_pago_esperado === "efectivo").reduce((acc, c) => acc + Number(c.total), 0);
    const cxcTarjeta = (cxc || []).filter(c => c.metodo_pago_esperado === "tarjeta").reduce((acc, c) => acc + Number(c.total), 0);
    const cxcTransferencia = (cxc || []).filter(c => c.metodo_pago_esperado === "transferencia").reduce((acc, c) => acc + Number(c.total), 0);

    return res.json({
      total_ventas: totalVentas,
      cantidad_facturas: (ordenes || []).length,
      total_efectivo: totalEfectivo,
      total_tarjeta: totalTarjeta,
      total_transferencia: totalTransferencia,
      total_itbis: totalItbis,
      cxc_cobradas: cxcCobradas,
      cxc_cantidad: (cxc || []).length,
      cxc_efectivo: cxcEfectivo,
      cxc_tarjeta: cxcTarjeta,
      cxc_transferencia: cxcTransferencia,
      total_general: totalVentas + cxcCobradas,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function getVentasPorPeriodo(req, res) {
  try {
    const { business_id, fecha_inicio, fecha_fin } = req.query;

    const { data: sucursales } = await supabase.from("branches").select("id").eq("business_id", business_id);
    const { data: cajas } = await supabase.from("cajas").select("id").in("sucursal_id", (sucursales || []).map(s => s.id));

    const { data: sesiones } = await supabase
      .from("sesiones_caja")
      .select("id")
      .in("caja_id", (cajas || []).map(c => c.id))
      .gte("fecha_apertura", `${fecha_inicio}T00:00:00`)
      .lte("fecha_apertura", `${fecha_fin}T23:59:59`);

    if (!sesiones || sesiones.length === 0) return res.json({ ordenes: [] });

    const { data: ordenes } = await supabase
      .from("ordenes")
      .select("id, nombre_cuenta, cliente_nombre, metodo_pago, total, itbis, created_at, users(nombre, apellido)")
      .eq("estado", "completada")
      .in("sesion_id", sesiones.map(s => s.id))
      .order("created_at", { ascending: false });

    if (!ordenes || ordenes.length === 0) return res.json({ ordenes: [] });

    // Traer items de todas las ordenes en una sola query separada
    const ordenIds = ordenes.map(o => o.id);
    const { data: todosItems } = await supabase
      .from("orden_items")
      .select("id, orden_id, cantidad, precio, notas, es_extra, productos(nombre)")
      .in("orden_id", ordenIds);

    // Mapear items a sus ordenes
    const itemsPorOrden = (todosItems || []).reduce((acc, item) => {
      if (!acc[item.orden_id]) acc[item.orden_id] = [];
      acc[item.orden_id].push(item);
      return acc;
    }, {});

    const ordenesConItems = ordenes.map(o => ({
      ...o,
      orden_items: itemsPorOrden[o.id] || []
    }));

    return res.json({ ordenes: ordenesConItems });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function getProductosMasVendidos(req, res) {
  try {
    const { business_id, fecha_inicio, fecha_fin } = req.query;

    const { data: sucursales } = await supabase.from("branches").select("id").eq("business_id", business_id);
    const { data: cajas } = await supabase.from("cajas").select("id").in("sucursal_id", (sucursales || []).map(s => s.id));

    const { data: sesiones } = await supabase
      .from("sesiones_caja")
      .select("id")
      .in("caja_id", (cajas || []).map(c => c.id))
      .gte("fecha_apertura", `${fecha_inicio}T00:00:00`)
      .lte("fecha_apertura", `${fecha_fin}T23:59:59`);

    if (!sesiones || sesiones.length === 0) return res.json({ productos: [] });

    const { data: ordenes } = await supabase
      .from("ordenes").select("id")
      .eq("estado", "completada")
      .in("sesion_id", sesiones.map(s => s.id));

    const ordenIds = (ordenes || []).map(o => o.id);
    if (ordenIds.length === 0) return res.json({ productos: [] });

    const { data: items } = await supabase
      .from("orden_items")
      .select("producto_id, cantidad, precio, productos(nombre)")
      .in("orden_id", ordenIds)
      .not("producto_id", "is", null);

    const agrupados = (items || []).reduce((acc, item) => {
      const key = item.producto_id;
      if (!acc[key]) acc[key] = { producto_id: key, nombre: item.productos?.nombre, cantidad: 0, total: 0 };
      acc[key].cantidad += item.cantidad;
      acc[key].total += Number(item.precio) * item.cantidad;
      return acc;
    }, {});

    return res.json({ productos: Object.values(agrupados).sort((a, b) => b.cantidad - a.cantidad).slice(0, 10) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function getVentasPorCajero(req, res) {
  try {
    const { business_id, fecha_inicio, fecha_fin } = req.query;

    const { data: sucursales } = await supabase.from("branches").select("id").eq("business_id", business_id);
    const { data: cajas } = await supabase.from("cajas").select("id").in("sucursal_id", (sucursales || []).map(s => s.id));

    const { data: sesiones } = await supabase
      .from("sesiones_caja")
      .select("id")
      .in("caja_id", (cajas || []).map(c => c.id))
      .gte("fecha_apertura", `${fecha_inicio}T00:00:00`)
      .lte("fecha_apertura", `${fecha_fin}T23:59:59`);

    if (!sesiones || sesiones.length === 0) return res.json({ cajeros: [] });

    const { data: ordenes } = await supabase
      .from("ordenes")
      .select("total, usuario_id, users(nombre, apellido)")
      .eq("estado", "completada")
      .in("sesion_id", sesiones.map(s => s.id));

    const agrupadas = (ordenes || []).reduce((acc, o) => {
      const key = o.usuario_id;
      if (!acc[key]) acc[key] = { usuario_id: key, nombre: `${o.users?.nombre} ${o.users?.apellido}`, cantidad_ventas: 0, total_ventas: 0 };
      acc[key].cantidad_ventas += 1;
      acc[key].total_ventas += Number(o.total);
      return acc;
    }, {});

    return res.json({ cajeros: Object.values(agrupadas).sort((a, b) => b.total_ventas - a.total_ventas) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function getSesionesCaja(req, res) {
  try {
    const { business_id, fecha_inicio, fecha_fin } = req.query;

    const { data: sucursales } = await supabase.from("branches").select("id").eq("business_id", business_id);
    const { data: cajas } = await supabase.from("cajas").select("id, nombre, codigo").in("sucursal_id", (sucursales || []).map(s => s.id));
    const cajaIds = (cajas || []).map(c => c.id);

    const { data: sesiones } = await supabase
      .from("sesiones_caja")
      .select("*, users(nombre, apellido)")
      .in("caja_id", cajaIds)
      .gte("fecha_apertura", `${fecha_inicio}T00:00:00`)
      .lte("fecha_apertura", `${fecha_fin}T23:59:59`)
      .order("fecha_apertura", { ascending: false });

    const conTotales = await Promise.all((sesiones || []).map(async (sesion) => {
      const caja = cajas.find(c => c.id === sesion.caja_id);

      const { data: ordenes } = await supabase
        .from("ordenes").select("total, metodo_pago")
        .eq("sesion_id", sesion.id).eq("estado", "completada");

      const { data: cxc } = await supabase
        .from("cuentas_por_cobrar")
        .select("total, metodo_pago_esperado")
        .eq("sesion_id", sesion.id)
        .eq("estado", "cobrada");

      const totalVentas = (ordenes || []).reduce((acc, o) => acc + Number(o.total), 0);
      const totalEfectivo = (ordenes || []).filter(o => o.metodo_pago === "efectivo").reduce((acc, o) => acc + Number(o.total), 0);
      const totalTarjeta = (ordenes || []).filter(o => o.metodo_pago === "tarjeta").reduce((acc, o) => acc + Number(o.total), 0);
      const totalTransferencia = (ordenes || []).filter(o => o.metodo_pago === "transferencia").reduce((acc, o) => acc + Number(o.total), 0);
      const cobrosEfectivo = (ordenes || []).filter(o => o.metodo_pago === "efectivo").length;
      const cobrosTarjeta = (ordenes || []).filter(o => o.metodo_pago === "tarjeta").length;
      const cobrosTransferencia = (ordenes || []).filter(o => o.metodo_pago === "transferencia").length;

      const cxcTotal = (cxc || []).reduce((acc, c) => acc + Number(c.total), 0);
      const cxcEfectivo = (cxc || []).filter(c => c.metodo_pago_esperado === "efectivo").reduce((acc, c) => acc + Number(c.total), 0);
      const cxcTarjeta = (cxc || []).filter(c => c.metodo_pago_esperado === "tarjeta").reduce((acc, c) => acc + Number(c.total), 0);
      const cxcTransferencia = (cxc || []).filter(c => c.metodo_pago_esperado === "transferencia").reduce((acc, c) => acc + Number(c.total), 0);

      return {
        ...sesion,
        cajas: caja,
        total_ventas: totalVentas,
        total_ventas_con_cxc: totalVentas + cxcTotal,
        cantidad_facturas: ordenes?.length || 0,
        total_efectivo: totalEfectivo,
        total_tarjeta: totalTarjeta,
        total_transferencia: totalTransferencia,
        cobros_efectivo: cobrosEfectivo,
        cobros_tarjeta: cobrosTarjeta,
        cobros_transferencia: cobrosTransferencia,
        cxc_total: cxcTotal,
        cxc_efectivo: cxcEfectivo,
        cxc_tarjeta: cxcTarjeta,
        cxc_transferencia: cxcTransferencia,
        cxc_cantidad: (cxc || []).length,
      };
    }));

    return res.json({ sesiones: conTotales });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = { getResumenDia, getVentasPorPeriodo, getProductosMasVendidos, getVentasPorCajero, getSesionesCaja };