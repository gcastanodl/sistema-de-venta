"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function ReportesPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [seccion, setSeccion] = useState("dia");
  const [resumenDia, setResumenDia] = useState(null);
  const [ventasDia, setVentasDia] = useState([]);
  const [desglosAbierto, setDesglosAbierto] = useState({});
  const [negocio, setNegocio] = useState(null);
  const [resumenPeriodo, setResumenPeriodo] = useState(null);
  const [ventasPeriodo, setVentasPeriodo] = useState([]);
  const [productosMasVendidos, setProductosMasVendidos] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [sesionesConCxC, setSesionesConCxC] = useState({});
  const [resumenSesiones, setResumenSesiones] = useState(null);
  const [fechaDia, setFechaDia] = useState(new Date().toISOString().split("T")[0]);
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split("T")[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split("T")[0]);

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/"); return; }
    cargarNegocio();
  }, [user, authLoading]);

  async function cargarNegocio() {
    try {
      const res = await fetch(`${API}/api/negocios/${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setNegocio(data.negocio || data.business || null);
    } catch (err) { console.error(err); }
  }

  async function buscarDia() {
    setLoading(true);
    setDesglosAbierto({});
    try {
      const [resRes, ventasRes] = await Promise.all([
        fetch(`${API}/api/reportes/resumen-dia?business_id=${user.business_id}&fecha=${fechaDia}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/reportes/ventas-periodo?business_id=${user.business_id}&fecha_inicio=${fechaDia}&fecha_fin=${fechaDia}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const resData = await resRes.json();
      const ventasData = await ventasRes.json();
      setResumenDia(resData);
      setVentasDia(ventasData.ordenes || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function buscarPeriodo() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/reportes/ventas-periodo?business_id=${user.business_id}&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const ordenes = data.ordenes || [];
      setVentasPeriodo(ordenes);
      setResumenPeriodo({
        total_ventas: ordenes.reduce((acc, o) => acc + Number(o.total), 0),
        total_efectivo: ordenes.filter(o => o.metodo_pago === "efectivo").reduce((acc, o) => acc + Number(o.total), 0),
        total_tarjeta: ordenes.filter(o => o.metodo_pago === "tarjeta").reduce((acc, o) => acc + Number(o.total), 0),
        total_transferencia: ordenes.filter(o => o.metodo_pago === "transferencia").reduce((acc, o) => acc + Number(o.total), 0),
        cobros_efectivo: ordenes.filter(o => o.metodo_pago === "efectivo").length,
        cobros_tarjeta: ordenes.filter(o => o.metodo_pago === "tarjeta").length,
        cobros_transferencia: ordenes.filter(o => o.metodo_pago === "transferencia").length,
        cantidad_facturas: ordenes.length,
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function buscarProductos() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/reportes/productos-mas-vendidos?business_id=${user.business_id}&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setProductosMasVendidos(data.productos || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function buscarSesiones() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/reportes/sesiones-caja?business_id=${user.business_id}&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const sess = data.sesiones || [];
      setSesiones(sess);
      setResumenSesiones({
        total_ventas: sess.reduce((acc, s) => acc + Number(s.total_ventas_con_cxc || s.total_ventas), 0),
        total_efectivo: sess.reduce((acc, s) => acc + Number(s.total_efectivo) + Number(s.cxc_efectivo || 0), 0),
        total_tarjeta: sess.reduce((acc, s) => acc + Number(s.total_tarjeta) + Number(s.cxc_tarjeta || 0), 0),
        total_transferencia: sess.reduce((acc, s) => acc + Number(s.total_transferencia) + Number(s.cxc_transferencia || 0), 0),
        cantidad_facturas: sess.reduce((acc, s) => acc + Number(s.cantidad_facturas), 0),
        cobros_efectivo: sess.reduce((acc, s) => acc + Number(s.cobros_efectivo || 0), 0),
        cobros_tarjeta: sess.reduce((acc, s) => acc + Number(s.cobros_tarjeta || 0), 0),
        cobros_transferencia: sess.reduce((acc, s) => acc + Number(s.cobros_transferencia || 0), 0),
      });

      const cxcMap = {};
      await Promise.all(sess.map(async (s) => {
        try {
          const cxcRes = await fetch(`${API}/api/cuentas-por-cobrar/resumen-sesion?sesion_id=${s.id}`, { headers: { Authorization: `Bearer ${token}` } });
          const cxcData = await cxcRes.json();
          if (cxcData.total_cobrado > 0) cxcMap[s.id] = cxcData;
        } catch (e) { console.error(e); }
      }));
      setSesionesConCxC(cxcMap);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function toggleDesglose(id) {
    setDesglosAbierto(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function reimprimirFactura(orden) {
    const items = orden.orden_items || [];
    const subtotal = items.reduce((acc, i) => acc + Number(i.precio) * i.cantidad, 0);
    const ITBIS_RATE = 0.18;
    const facturaData = encodeURIComponent(JSON.stringify({
      items,
      orden: {
        nombre_cuenta: orden.nombre_cuenta || orden.cliente_nombre,
        cliente_telefono: orden.cliente_telefono || null,
        rnc_cliente: orden.rnc_cliente || null,
      },
      negocio,
      subtotal,
      itbis: subtotal - subtotal / (1 + ITBIS_RATE),
      total: Number(orden.total),
      descuento: 0,
      metodo_pago: orden.metodo_pago,
      monto_recibido: Number(orden.total),
      pagos: null,
      vuelto: 0,
      fecha: orden.created_at,
    }));
    window.open(`/cajero/factura?data=${facturaData}`, "_blank", "width=400,height=700");
  }

  function imprimirCierre(sesion, cxc) {
    const fecha = sesion.fecha_apertura.split("T")[0];
    fetch(`${API}/api/reportes/ventas-periodo?business_id=${user.business_id}&fecha_inicio=${fecha}&fecha_fin=${fecha}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        const cierreData = encodeURIComponent(JSON.stringify({ sesion, cxc, negocio, ventas: data.ordenes || [] }));
        window.open(`/cajero/cierre?data=${cierreData}`, "_blank", "width=400,height=800");
      })
      .catch(() => {
        const cierreData = encodeURIComponent(JSON.stringify({ sesion, cxc, negocio, ventas: [] }));
        window.open(`/cajero/cierre?data=${cierreData}`, "_blank", "width=400,height=800");
      });
  }

  if (authLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold"><span className="text-white">SLOT</span><span className="text-amber-400"> SYSTEM</span></h1>
            <p className="text-slate-400 text-sm mt-1">Reportes</p>
          </div>
          <button onClick={() => router.push("/dashboard")} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm hover:border-amber-400/50 transition-all">← Dashboard</button>
        </div>

        <div className="flex gap-2 mb-6">
          {[
            { key: "dia", label: "Ventas del día" },
            { key: "periodo", label: "Ventas por período" },
            { key: "sesiones", label: "Cuadres de caja" },
            { key: "productos", label: "Más vendidos" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setSeccion(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${seccion === tab.key ? "bg-amber-400 text-slate-900" : "bg-slate-800/50 text-slate-300 hover:bg-slate-700"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* VENTAS DEL DÍA */}
        {seccion === "dia" && (
          <>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 mb-6 flex items-end gap-3">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Fecha</label>
                <input type="date" value={fechaDia} onChange={e => setFechaDia(e.target.value)}
                  className="block mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <button onClick={buscarDia} className="px-5 py-2 bg-amber-400 text-slate-900 rounded-xl text-sm font-semibold hover:bg-amber-300 transition-all">Buscar</button>
            </div>

            {resumenDia && (
              <>
                <div className="bg-slate-900 border border-amber-400/30 rounded-2xl p-5 mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Total cobrado del día</p>
                      <p className="text-3xl font-bold text-amber-400">RD${Number(resumenDia.total_general || resumenDia.total_ventas || 0).toFixed(2)}</p>
                      <p className="text-xs text-slate-500 mt-1">{resumenDia.cantidad_facturas || 0} facturas + {resumenDia.cxc_cantidad || 0} CxC cobradas</p>
                    </div>
                    {Number(resumenDia.cxc_cobradas || 0) > 0 && (
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-right">
                        <p className="text-xs text-orange-300 uppercase tracking-widest mb-1">📋 CxC cobradas</p>
                        <p className="text-xl font-bold text-orange-400">RD${Number(resumenDia.cxc_cobradas).toFixed(2)}</p>
                        <p className="text-xs text-slate-500 mt-1">{resumenDia.cxc_cantidad || 0} cuentas</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">💵 Efectivo total</p>
                    <p className="text-xl font-bold text-green-400">RD${(Number(resumenDia.total_efectivo || 0) + Number(resumenDia.cxc_efectivo || 0)).toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-1">Ventas: RD${Number(resumenDia.total_efectivo || 0).toFixed(2)}</p>
                    {Number(resumenDia.cxc_efectivo || 0) > 0 && <p className="text-xs text-orange-400 mt-0.5">CxC: RD${Number(resumenDia.cxc_efectivo).toFixed(2)}</p>}
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">💳 Tarjeta total</p>
                    <p className="text-xl font-bold text-blue-400">RD${(Number(resumenDia.total_tarjeta || 0) + Number(resumenDia.cxc_tarjeta || 0)).toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-1">Ventas: RD${Number(resumenDia.total_tarjeta || 0).toFixed(2)}</p>
                    {Number(resumenDia.cxc_tarjeta || 0) > 0 && <p className="text-xs text-orange-400 mt-0.5">CxC: RD${Number(resumenDia.cxc_tarjeta).toFixed(2)}</p>}
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">📱 Transferencia total</p>
                    <p className="text-xl font-bold text-purple-400">RD${(Number(resumenDia.total_transferencia || 0) + Number(resumenDia.cxc_transferencia || 0)).toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-1">Ventas: RD${Number(resumenDia.total_transferencia || 0).toFixed(2)}</p>
                    {Number(resumenDia.cxc_transferencia || 0) > 0 && <p className="text-xs text-orange-400 mt-0.5">CxC: RD${Number(resumenDia.cxc_transferencia).toFixed(2)}</p>}
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                  {ventasDia.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">No hay ventas en esta fecha</p>
                  ) : (
                    <>
                      <div className="px-6 py-3 border-b border-slate-800">
                        <p className="text-xs text-slate-400">Haz clic en una venta para ver el desglose y reimprimir</p>
                      </div>
                      <div className="flex flex-col">
                        {ventasDia.map((o, i) => (
                          <div key={i} className="border-b border-slate-800/50">
                            <button
                              onClick={() => toggleDesglose(o.id)}
                              className="w-full flex items-center justify-between px-6 py-3 hover:bg-slate-800/30 transition-all text-left">
                              <div className="flex items-center gap-4">
                                <span className="text-slate-400 text-sm">{new Date(o.created_at).toLocaleTimeString("es-DO")}</span>
                                <span className="text-white text-sm font-medium">{o.nombre_cuenta || o.cliente_nombre || "—"}</span>
                                <span className="text-slate-400 text-xs capitalize px-2 py-0.5 bg-slate-800 rounded-lg">{o.metodo_pago || "—"}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-amber-400 font-bold text-sm">RD${Number(o.total).toFixed(2)}</span>
                                <span className="text-slate-500 text-xs">{desglosAbierto[o.id] ? "▲" : "▼"}</span>
                              </div>
                            </button>

                            {desglosAbierto[o.id] && (
                              <div className="px-6 pb-4 bg-slate-800/20">
                                <div className="border-t border-slate-700/50 pt-3">
                                  <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Consumo:</p>
                                  <div className="flex flex-col gap-1 mb-3">
                                    {(o.orden_items || []).map((item, j) => (
                                      <div key={j} className="flex justify-between items-center text-sm">
                                        <span className={item.es_extra ? "text-purple-400" : "text-slate-300"}>
                                          {item.es_extra ? `EXTRA: ${item.notas}` : item.productos?.nombre || item.notas || "—"}
                                          <span className="text-slate-500 ml-2">x{item.cantidad}</span>
                                        </span>
                                        <span className="text-white">RD${(Number(item.precio) * item.cantidad).toFixed(2)}</span>
                                      </div>
                                    ))}
                                    {(o.orden_items || []).length === 0 && (
                                      <p className="text-slate-500 text-xs">Sin detalle disponible</p>
                                    )}
                                  </div>
                                  <div className="flex justify-between font-semibold text-sm pt-2 border-t border-slate-700/50 mb-3">
                                    <span className="text-slate-300">Total</span>
                                    <span className="text-amber-400">RD${Number(o.total).toFixed(2)}</span>
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); reimprimirFactura(o); }}
                                    className="w-full py-2 rounded-xl text-xs font-semibold bg-blue-500 text-white hover:bg-blue-400 transition-all">
                                    🖨️ Reimprimir factura
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {!resumenDia && !loading && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
                Selecciona una fecha y presiona Buscar
              </div>
            )}
          </>
        )}

        {/* VENTAS POR PERÍODO */}
        {seccion === "periodo" && (
          <>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 mb-6 flex items-end gap-3">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Desde</label>
                <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                  className="block mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Hasta</label>
                <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
                  className="block mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <button onClick={buscarPeriodo} className="px-5 py-2 bg-amber-400 text-slate-900 rounded-xl text-sm font-semibold hover:bg-amber-300 transition-all">Buscar</button>
            </div>

            {resumenPeriodo && (
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Total ventas</p>
                  <p className="text-xl font-bold text-amber-400">RD${Number(resumenPeriodo.total_ventas).toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-1">{resumenPeriodo.cantidad_facturas} facturas</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Efectivo</p>
                  <p className="text-xl font-bold text-green-400">RD${Number(resumenPeriodo.total_efectivo).toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-1">{resumenPeriodo.cobros_efectivo} cobros</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Tarjeta</p>
                  <p className="text-xl font-bold text-blue-400">RD${Number(resumenPeriodo.total_tarjeta).toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-1">{resumenPeriodo.cobros_tarjeta} cobros</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Transferencia</p>
                  <p className="text-xl font-bold text-purple-400">RD${Number(resumenPeriodo.total_transferencia).toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-1">{resumenPeriodo.cobros_transferencia} cobros</p>
                </div>
              </div>
            )}

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                <h2 className="font-semibold">Ventas del período</h2>
                <span className="text-slate-400 text-sm">{ventasPeriodo.length} facturas — RD${ventasPeriodo.reduce((acc, o) => acc + Number(o.total), 0).toFixed(2)}</span>
              </div>
              {ventasPeriodo.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Selecciona un período y presiona Buscar</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-3">Fecha</th>
                      <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-3">Cliente</th>
                      <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-3">Método</th>
                      <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasPeriodo.map((o, i) => (
                      <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-all">
                        <td className="px-6 py-3 text-sm text-slate-300">{new Date(o.created_at).toLocaleString("es-DO")}</td>
                        <td className="px-6 py-3 text-sm text-white">{o.nombre_cuenta || o.cliente_nombre || "—"}</td>
                        <td className="px-6 py-3 text-sm text-slate-300 capitalize">{o.metodo_pago || "—"}</td>
                        <td className="px-6 py-3 text-sm text-amber-400 font-bold">RD${Number(o.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* CUADRES DE CAJA */}
        {seccion === "sesiones" && (
          <>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 mb-6 flex items-end gap-3">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Desde</label>
                <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                  className="block mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Hasta</label>
                <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
                  className="block mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <button onClick={buscarSesiones} className="px-5 py-2 bg-amber-400 text-slate-900 rounded-xl text-sm font-semibold hover:bg-amber-300 transition-all">Buscar</button>
            </div>

            {resumenSesiones && (
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-slate-900 border border-amber-400/30 rounded-2xl p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Total cobrado</p>
                  <p className="text-xl font-bold text-amber-400">RD${Number(resumenSesiones.total_ventas).toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-1">{resumenSesiones.cantidad_facturas} facturas</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">💵 Efectivo</p>
                  <p className="text-xl font-bold text-green-400">RD${Number(resumenSesiones.total_efectivo).toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-1">{resumenSesiones.cobros_efectivo} cobros</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">💳 Tarjeta</p>
                  <p className="text-xl font-bold text-blue-400">RD${Number(resumenSesiones.total_tarjeta).toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-1">{resumenSesiones.cobros_tarjeta} cobros</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">📱 Transferencia</p>
                  <p className="text-xl font-bold text-purple-400">RD${Number(resumenSesiones.total_transferencia).toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-1">{resumenSesiones.cobros_transferencia} cobros</p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4">
              {sesiones.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">Selecciona un período y presiona Buscar</div>
              ) : sesiones.map((s, i) => {
                const descuadreEfectivo = Number(s.diferencia || 0);
                const efectivoEsperado = Number(s.monto_apertura || 0) + Number(s.total_efectivo || 0);
                const efectivoContado = Number(s.total_efectivo_arqueo || s.monto_cierre_real || 0);
                const tarjetaContada = Number(s.total_tarjeta_arqueo || s.total_tarjeta || 0);
                const transferenciaContada = Number(s.total_transferencia_arqueo || s.total_transferencia || 0);
                const descuadreTarjeta = tarjetaContada - Number(s.total_tarjeta || 0);
                const descuadreTransferencia = transferenciaContada - Number(s.total_transferencia || 0);
                const cxc = sesionesConCxC[s.id];
                const cxcTotal = Number(s.cxc_total || 0);
                const totalConCxC = Number(s.total_ventas_con_cxc || s.total_ventas || 0);

                return (
                  <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-white font-semibold">{s.cajas?.nombre} — {s.cajas?.codigo}</p>
                        <p className="text-slate-400 text-xs">{s.users?.nombre} {s.users?.apellido}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => imprimirCierre(s, cxc)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all">
                          🖨️ Imprimir cierre
                        </button>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${s.estado === "abierta" ? "bg-green-900/30 text-green-400 border-green-500/30" : "bg-slate-700 text-slate-400 border-slate-600"}`}>
                          {s.estado}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div><p className="text-xs text-slate-400">Apertura</p><p className="text-sm text-white">{new Date(s.fecha_apertura).toLocaleString("es-DO")}</p></div>
                      <div><p className="text-xs text-slate-400">Cierre</p><p className="text-sm text-white">{s.fecha_cierre ? new Date(s.fecha_cierre).toLocaleString("es-DO") : "—"}</p></div>
                      <div><p className="text-xs text-slate-400">Facturas</p><p className="text-sm text-white">{s.cantidad_facturas}</p></div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-slate-800 rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-400">💵 Efectivo</p>
                        <p className="text-sm text-green-400 font-bold">RD${(Number(s.total_efectivo) + Number(s.cxc_efectivo || 0)).toFixed(2)}</p>
                        {Number(s.cxc_efectivo || 0) > 0 && <p className="text-xs text-orange-400">+CxC RD${Number(s.cxc_efectivo).toFixed(2)}</p>}
                      </div>
                      <div className="bg-slate-800 rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-400">💳 Tarjeta</p>
                        <p className="text-sm text-blue-400 font-bold">RD${(Number(s.total_tarjeta) + Number(s.cxc_tarjeta || 0)).toFixed(2)}</p>
                        {Number(s.cxc_tarjeta || 0) > 0 && <p className="text-xs text-orange-400">+CxC RD${Number(s.cxc_tarjeta).toFixed(2)}</p>}
                      </div>
                      <div className="bg-slate-800 rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-400">📱 Transferencia</p>
                        <p className="text-sm text-purple-400 font-bold">RD${(Number(s.total_transferencia) + Number(s.cxc_transferencia || 0)).toFixed(2)}</p>
                        {Number(s.cxc_transferencia || 0) > 0 && <p className="text-xs text-orange-400">+CxC RD${Number(s.cxc_transferencia).toFixed(2)}</p>}
                      </div>
                    </div>

                    {cxcTotal > 0 && (
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-3">
                        <p className="text-xs text-orange-300 uppercase tracking-widest mb-2">📋 Cuentas por cobrar cobradas</p>
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Total CxC cobrado</span>
                            <span className="text-orange-400 font-bold">RD${cxcTotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Cantidad</span>
                            <span className="text-white">{s.cxc_cantidad || 0} cuenta(s)</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-3">
                      <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">Desglose del arqueo</p>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">💼 Apertura de caja</span>
                          <span className="text-white">RD${Number(s.monto_apertura || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">💵 Ventas efectivo</span>
                          <span className="text-white">RD${Number(s.total_efectivo || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold border-t border-slate-700 pt-2">
                          <span className="text-white">Efectivo esperado</span>
                          <span className="text-amber-400">RD${efectivoEsperado.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">💵 Efectivo contado</span>
                          <span className="text-white">RD${efectivoContado.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Descuadre efectivo</span>
                          <span className={`font-bold ${descuadreEfectivo === 0 ? "text-green-400" : descuadreEfectivo > 0 ? "text-blue-400" : "text-red-400"}`}>
                            {descuadreEfectivo === 0 ? "✓ Cuadrado" : descuadreEfectivo > 0 ? `+RD$${descuadreEfectivo.toFixed(2)} sobrante` : `RD$${Math.abs(descuadreEfectivo).toFixed(2)} faltante`}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-slate-700 pt-2">
                          <span className="text-slate-400">💳 Tarjeta contada</span>
                          <span className={`font-bold ${descuadreTarjeta === 0 ? "text-green-400" : descuadreTarjeta > 0 ? "text-blue-400" : "text-red-400"}`}>
                            RD${tarjetaContada.toFixed(2)} {descuadreTarjeta !== 0 ? `(${descuadreTarjeta > 0 ? "+" : ""}RD$${descuadreTarjeta.toFixed(2)})` : "✓"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">📱 Transferencia contada</span>
                          <span className={`font-bold ${descuadreTransferencia === 0 ? "text-green-400" : descuadreTransferencia > 0 ? "text-blue-400" : "text-red-400"}`}>
                            RD${transferenciaContada.toFixed(2)} {descuadreTransferencia !== 0 ? `(${descuadreTransferencia > 0 ? "+" : ""}RD$${descuadreTransferencia.toFixed(2)})` : "✓"}
                          </span>
                        </div>
                        {cxcTotal > 0 && (
                          <div className="flex justify-between text-sm border-t border-slate-700 pt-2">
                            <span className="text-orange-300">📋 CxC cobradas</span>
                            <span className="text-orange-400 font-bold">RD${cxcTotal.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-800 rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-400">Total ventas sistema</p>
                        <p className="text-sm text-amber-400 font-bold">RD${Number(s.total_ventas).toFixed(2)}</p>
                      </div>
                      <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-400">Total cobrado (incl. CxC)</p>
                        <p className="text-sm text-amber-400 font-bold">RD${totalConCxC.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* MÁS VENDIDOS */}
        {seccion === "productos" && (
          <>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 mb-6 flex items-end gap-3">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Desde</label>
                <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                  className="block mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Hasta</label>
                <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
                  className="block mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <button onClick={buscarProductos} className="px-5 py-2 bg-amber-400 text-slate-900 rounded-xl text-sm font-semibold hover:bg-amber-300 transition-all">Buscar</button>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800">
                <h2 className="font-semibold">Productos más vendidos</h2>
              </div>
              {productosMasVendidos.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Selecciona un período y presiona Buscar</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-3">#</th>
                      <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-3">Producto</th>
                      <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-3">Cantidad</th>
                      <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-3">Total generado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosMasVendidos.map((p, i) => (
                      <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-all">
                        <td className="px-6 py-3 text-sm text-slate-400">#{i + 1}</td>
                        <td className="px-6 py-3 text-sm text-white font-medium">{p.nombre}</td>
                        <td className="px-6 py-3 text-sm text-white">{p.cantidad} unidades</td>
                        <td className="px-6 py-3 text-sm text-amber-400 font-bold">RD${Number(p.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {loading && <div className="text-center text-slate-400 py-8">Cargando...</div>}
      </div>
    </div>
  );
}