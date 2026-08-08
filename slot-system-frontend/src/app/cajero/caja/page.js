"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function CajaPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sesion, setSesion] = useState(null);
  const [cajas, setCajas] = useState([]);
  const [cajaSeleccionada, setCajaSeleccionada] = useState(null);
  const [loading, setLoading] = useState(true);
  const [montoApertura, setMontoApertura] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ordenesAbiertas, setOrdenesAbiertas] = useState(0);
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState(0);

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/"); return; }
    cargarCajas();
  }, [user, authLoading]);

  async function cargarCajas() {
    try {
      const sucRes = await fetch(`${API}/api/sucursales?business_id=${user.business_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sucData = await sucRes.json();

      if (sucData.sucursales?.length > 0) {
        const cajasPromises = sucData.sucursales.map(s =>
          fetch(`${API}/api/cajas?sucursal_id=${s.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(r => r.json())
        );
        const cajasResults = await Promise.all(cajasPromises);
        const todasCajas = cajasResults.flatMap(r => r.cajas || []);
        setCajas(todasCajas);

        if (todasCajas.length > 0) {
          setCajaSeleccionada(todasCajas[0]);
          await verificarSesion(todasCajas[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function verificarSesion(caja_id) {
    try {
      const res = await fetch(`${API}/api/cajas/sesion-activa?caja_id=${caja_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSesion(data.sesion);

      if (data.sesion) {
        // Cargar ordenes activas (solo pendientes, no cuentas por cobrar)
        const ordenesRes = await fetch(`${API}/api/ordenes/activas?sesion_id=${data.sesion.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const ordenesData = await ordenesRes.json();
        const todasOrdenes = ordenesData.ordenes || [];

        // Separar cuentas por cobrar de órdenes realmente abiertas
        const cxc = todasOrdenes.filter(o => o.estado === "cuenta_por_cobrar");
        const abiertas = todasOrdenes.filter(o => o.estado === "pendiente");

        setOrdenesAbiertas(abiertas.length);
        setCuentasPorCobrar(cxc.length);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function abrirCaja() {
    if (!montoApertura) { setError("Ingresa el monto de apertura"); return; }
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/cajas/abrir`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          caja_id: cajaSeleccionada.id,
          usuario_id: user.id,
          monto_apertura: parseFloat(montoApertura)
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSesion(data.sesion);
      setMontoApertura("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function intentarCerrarCaja() {
    if (ordenesAbiertas > 0) {
      setError(`No puedes cerrar la caja — hay ${ordenesAbiertas} cuenta${ordenesAbiertas > 1 ? "s" : ""} abierta${ordenesAbiertas > 1 ? "s" : ""}. Ciérralas primero.`);
      return;
    }
    router.push(`/cajero/arqueo?sesion_id=${sesion.id}`);
  }

  if (authLoading || loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-lg mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold"><span className="text-white">SLOT</span><span className="text-amber-400"> SYSTEM</span></h1>
            <p className="text-slate-400 text-sm mt-1">Apertura de caja</p>
          </div>
          <button onClick={() => router.push("/cajero")} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm hover:border-amber-400/50 transition-all">← Volver</button>
        </div>

        {cajas.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <p className="text-slate-400">No hay cajas registradas.</p>
          </div>
        ) : (
          <>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
              <label className="text-xs text-slate-400 uppercase tracking-widest">Caja</label>
              <select
                value={cajaSeleccionada?.id || ""}
                onChange={async e => {
                  const caja = cajas.find(c => c.id === e.target.value);
                  setCajaSeleccionada(caja);
                  await verificarSesion(caja.id);
                }}
                className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400"
              >
                {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre} — {c.codigo}</option>)}
              </select>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {!sesion ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-2">Abrir caja</h2>
                <p className="text-slate-400 text-sm mb-6">La caja está cerrada. Ingresa el monto inicial para abrir.</p>
                <div className="mb-4">
                  <label className="text-xs text-slate-400 uppercase tracking-widest">Monto de apertura (RD$)</label>
                  <input
                    type="number"
                    value={montoApertura}
                    onChange={e => setMontoApertura(e.target.value)}
                    placeholder="5000.00"
                    className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400"
                  />
                </div>
                <button onClick={abrirCaja} disabled={saving}
                  className="w-full py-3 rounded-xl font-semibold text-sm bg-green-500 text-white hover:bg-green-400 transition-all disabled:opacity-60">
                  {saving ? "Abriendo..." : "✓ Abrir caja"}
                </button>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
                  <h2 className="text-lg font-semibold">Caja abierta</h2>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <p className="text-xs text-slate-400 mb-1">Monto apertura</p>
                    <p className="text-xl font-bold text-white">RD${Number(sesion.monto_apertura).toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <p className="text-xs text-slate-400 mb-1">Hora apertura</p>
                    <p className="text-sm font-medium text-white">{new Date(sesion.fecha_apertura).toLocaleTimeString()}</p>
                  </div>
                </div>

                {ordenesAbiertas > 0 && (
                  <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl px-4 py-3 mb-4">
                    <p className="text-sm text-amber-400">⚠ Hay {ordenesAbiertas} cuenta{ordenesAbiertas > 1 ? "s" : ""} abierta{ordenesAbiertas > 1 ? "s" : ""} — ciérralas antes de cerrar la caja.</p>
                  </div>
                )}

                {cuentasPorCobrar > 0 && (
                  <div className="bg-orange-900/20 border border-orange-500/30 rounded-xl px-4 py-3 mb-4">
                    <p className="text-sm text-orange-400">📋 {cuentasPorCobrar} cuenta{cuentasPorCobrar > 1 ? "s" : ""} por cobrar pendiente{cuentasPorCobrar > 1 ? "s" : ""} — no bloquean el cierre.</p>
                  </div>
                )}

                <button onClick={intentarCerrarCaja}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${ordenesAbiertas > 0 ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-red-500 text-white hover:bg-red-400"}`}>
                  ✕ Cerrar caja — Ir al arqueo
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}