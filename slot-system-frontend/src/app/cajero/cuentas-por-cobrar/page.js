"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function CuentasPorCobrarPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(null);

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/"); return; }
    cargarCuentas();
  }, [user, authLoading]);

  async function cargarCuentas() {
    try {
      const res = await fetch(`${API}/api/cuentas-por-cobrar?business_id=${user.business_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      // Solo mostrar pendientes, las en_facturacion ya fueron mandadas al POS
      setCuentas((data.cuentas || []).filter(c => c.estado === "pendiente"));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function mandarAFacturacion(cuenta) {
    setProcesando(cuenta.id);
    try {
      const res = await fetch(`${API}/api/cuentas-por-cobrar/${cuenta.id}/facturar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Error al mandar a facturación");
      // Quitar de la lista inmediatamente antes de redirigir
      setCuentas(prev => prev.filter(c => c.id !== cuenta.id));
      router.push(`/cajero/ventas?orden_id=${data.orden_id}`);
    } catch (err) { console.error(err); }
    finally { setProcesando(null); }
  }

  const totalPendiente = cuentas.reduce((acc, c) => acc + Number(c.total), 0);

  if (authLoading || loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold"><span className="text-white">SLOT</span><span className="text-amber-400"> SYSTEM</span></h1>
            <p className="text-slate-400 text-sm mt-1">Cuentas por cobrar</p>
          </div>
          <button onClick={() => router.push("/cajero")} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm hover:border-amber-400/50 transition-all">← Volver</button>
        </div>

        <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-5 mb-6">
          <p className="text-xs text-orange-300 uppercase tracking-widest mb-1">Total pendiente por cobrar</p>
          <p className="text-4xl font-bold text-orange-400">RD${totalPendiente.toFixed(2)}</p>
          <p className="text-orange-300/70 text-sm mt-1">{cuentas.length} cuenta(s) pendiente(s)</p>
        </div>

        <div className="flex flex-col gap-4">
          {cuentas.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
              No hay cuentas pendientes por cobrar
            </div>
          ) : cuentas.map((c, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-white font-semibold">{c.nombre_cuenta || c.cliente_nombre || "Sin nombre"}</p>
                  {c.cliente_telefono && <p className="text-slate-400 text-xs mt-0.5">📞 {c.cliente_telefono}</p>}
                  <p className="text-slate-500 text-xs mt-0.5">{new Date(c.created_at).toLocaleString("es-DO")}</p>
                </div>
                <p className="text-2xl font-bold text-amber-400">RD${Number(c.total).toFixed(2)}</p>
              </div>

              {c.notas && (
                <div className="bg-slate-800/50 rounded-xl p-3 mb-3">
                  <p className="text-slate-400 text-xs">{c.notas}</p>
                </div>
              )}

              <button
                onClick={() => mandarAFacturacion(c)}
                disabled={procesando === c.id}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-50">
                {procesando === c.id ? "Procesando..." : "🛒 Mandar a facturación"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}