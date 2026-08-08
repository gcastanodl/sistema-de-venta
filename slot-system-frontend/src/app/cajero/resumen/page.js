"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";

function ResumenPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sesion_id = searchParams.get("sesion_id");

  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/"); return; }
    if (!sesion_id) { router.push("/cajero"); return; }
    cargarResumen();
  }, [user, authLoading]);

  async function cargarResumen() {
    try {
      const res = await fetch(`${API}/api/arqueo/resumen/${sesion_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setResumen(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>;
  if (!resumen) return null;

  const { sesion, arqueo } = resumen;
  const diferencia = Number(sesion.diferencia || 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-lg mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold"><span className="text-white">SLOT</span><span className="text-amber-400"> SYSTEM</span></h1>
            <p className="text-slate-400 text-sm mt-1">Resumen de cuadre</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-4">
          <h2 className="text-lg font-semibold mb-4">Información del turno</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400">Cajero</p>
              <p className="text-white font-medium">{sesion.users?.nombre} {sesion.users?.apellido}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Caja</p>
              <p className="text-white font-medium">{sesion.cajas?.nombre}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Apertura</p>
              <p className="text-white font-medium">{new Date(sesion.fecha_apertura).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Cierre</p>
              <p className="text-white font-medium">{new Date(sesion.fecha_cierre).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-4">
          <h2 className="text-lg font-semibold mb-4">Resumen financiero</h2>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <p className="text-slate-400">Monto apertura</p>
              <p className="text-white font-medium">RD${Number(sesion.monto_apertura).toLocaleString()}</p>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <p className="text-slate-400">Monto esperado</p>
              <p className="text-white font-medium">RD${Number(sesion.monto_cierre_esperado).toLocaleString()}</p>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <p className="text-slate-400">Monto contado</p>
              <p className="text-white font-medium">RD${Number(sesion.monto_cierre_real).toLocaleString()}</p>
            </div>
            <div className="flex justify-between items-center py-2">
              <p className="text-slate-400 font-semibold">Diferencia</p>
              <p className={`text-xl font-bold ${diferencia === 0 ? "text-green-400" : diferencia > 0 ? "text-blue-400" : "text-red-400"}`}>
                {diferencia >= 0 ? "+" : ""}RD${diferencia.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {arqueo.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-4">
            <h2 className="text-lg font-semibold mb-4">Denominaciones contadas</h2>
            <div className="flex flex-col gap-2">
              {arqueo.map(a => (
                <div key={a.id} className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <p className="text-slate-400">RD${Number(a.denominaciones?.valor).toLocaleString()} × {a.cantidad}</p>
                  <p className="text-white font-medium">RD${Number(a.subtotal).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`rounded-2xl p-6 mb-6 border ${diferencia === 0 ? "bg-green-900/20 border-green-500/30" : diferencia > 0 ? "bg-blue-900/20 border-blue-500/30" : "bg-red-900/20 border-red-500/30"}`}>
          <p className={`text-center font-bold text-lg ${diferencia === 0 ? "text-green-400" : diferencia > 0 ? "text-blue-400" : "text-red-400"}`}>
            {diferencia === 0 ? "✓ Caja cuadrada perfectamente" : diferencia > 0 ? `↑ Sobrante de RD$${diferencia.toLocaleString()}` : `↓ Faltante de RD$${Math.abs(diferencia).toLocaleString()}`}
          </p>
        </div>

        <button onClick={() => router.push("/cajero")}
          className="w-full py-4 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all">
          Volver al panel
        </button>
      </div>
    </div>
  );
}

export default function ResumenPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>}>
      <ResumenPage />
    </Suspense>
  );
}