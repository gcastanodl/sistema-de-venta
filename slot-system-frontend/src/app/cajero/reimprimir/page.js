"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function ReimprimirPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [negocio, setNegocio] = useState(null);

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/"); return; }
    cargarDatos();
  }, [user, authLoading]);

  async function cargarDatos() {
    try {
      const [negocioRes, sucRes] = await Promise.all([
        fetch(`${API}/api/negocios/${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/sucursales?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const negocioData = await negocioRes.json();
      const sucData = await sucRes.json();
      setNegocio(negocioData.negocio || negocioData.business || null);

      if (sucData.sucursales?.length > 0) {
        const cajasRes = await fetch(`${API}/api/cajas?sucursal_id=${sucData.sucursales[0].id}`, { headers: { Authorization: `Bearer ${token}` } });
        const cajasData = await cajasRes.json();
        if (cajasData.cajas?.length > 0) {
          const sesionRes = await fetch(`${API}/api/cajas/sesion-activa?caja_id=${cajasData.cajas[0].id}`, { headers: { Authorization: `Bearer ${token}` } });
          const sesionData = await sesionRes.json();
          if (sesionData.sesion) {
            const ordenesRes = await fetch(`${API}/api/ordenes/activas?sesion_id=${sesionData.sesion.id}&estado=completada`, { headers: { Authorization: `Bearer ${token}` } });
            const ordenesData = await ordenesRes.json();
            setOrdenes(ordenesData.ordenes || []);
          }
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function reimprimirFactura(orden) {
    try {
      const res = await fetch(`${API}/api/ordenes/${orden.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const o = data.orden;
      const items = o.orden_items || [];
      const subtotal = items.reduce((acc, item) => acc + (Number(item.precio) * item.cantidad), 0);
      const itbisTotal = items.reduce((acc, item) => item.productos?.itbis ? acc + (Number(item.precio) * item.cantidad * 0.18) : acc, 0);
      const total = subtotal + itbisTotal;
      const facturaData = encodeURIComponent(JSON.stringify({
        items, orden: o, negocio,
        subtotal, itbis: itbisTotal, total,
        metodo_pago: o.metodo_pago,
        monto_recibido: o.monto_recibido || total,
        vuelto: o.vuelto || 0,
        fecha: o.created_at
      }));
      window.open(`/cajero/factura?data=${facturaData}`, "_blank", "width=400,height=600");
    } catch (err) { console.error(err); }
  }

  if (authLoading || loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold"><span className="text-white">SLOT</span><span className="text-amber-400"> SYSTEM</span></h1>
            <p className="text-slate-400 text-sm mt-1">Reimprimir factura</p>
          </div>
          <button onClick={() => router.push("/cajero")} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm hover:border-amber-400/50 transition-all">← Volver</button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="font-semibold">Facturas del turno actual</h2>
            <p className="text-slate-400 text-xs mt-1">{new Date().toLocaleDateString("es-DO")}</p>
          </div>
          {ordenes.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No hay facturas emitidas en este turno</div>
          ) : (
            <div className="flex flex-col">
              {ordenes.map((o, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-all">
                  <div>
                    <p className="text-white font-medium">{o.nombre_cuenta || o.cliente_nombre || "Sin nombre"}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{new Date(o.created_at).toLocaleTimeString("es-DO")} — <span className="capitalize">{o.metodo_pago}</span></p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-amber-400 font-bold">RD${Number(o.total).toFixed(2)}</p>
                    <button onClick={() => reimprimirFactura(o)}
                      className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-400 transition-all">
                      🖨️ Reimprimir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}