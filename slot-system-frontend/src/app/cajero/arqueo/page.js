"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";

function ArqueoPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sesion_id = searchParams.get("sesion_id");

  const [denominaciones, setDenominaciones] = useState([]);
  const [cantidades, setCantidades] = useState({});
  const [montoPorTarjeta, setMontoPorTarjeta] = useState("");
  const [montoPorTransferencia, setMontoPorTransferencia] = useState("");
  const [ventasSesion, setVentasSesion] = useState(null);
  const [sesionInfo, setSesionInfo] = useState(null);
  const [cxcResumen, setCxcResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/"); return; }
    if (!sesion_id) { router.push("/cajero/caja"); return; }
    cargarDatos();
  }, [user, authLoading]);

  async function cargarDatos() {
    try {
      const [denomRes, ventasRes, cxcRes] = await Promise.all([
        fetch(`${API}/api/arqueo/denominaciones`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/reportes/resumen-dia?business_id=${user.business_id}&fecha=${new Date().toISOString().split("T")[0]}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/cuentas-por-cobrar/resumen-sesion?sesion_id=${sesion_id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const denomData = await denomRes.json();
      setDenominaciones(denomData.denominaciones || []);
      const inicial = {};
      denomData.denominaciones?.forEach(d => { inicial[d.id] = 0; });
      setCantidades(inicial);

      const ventasData = await ventasRes.json();
      setVentasSesion(ventasData);

      const cxcData = await cxcRes.json();
      setCxcResumen(cxcData);

      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        const { data: sesion } = await supabase
          .from("sesiones_caja")
          .select("monto_apertura, fecha_apertura")
          .eq("id", sesion_id)
          .single();
        setSesionInfo(sesion);
      } catch (e) { console.error(e); }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function calcularTotalEfectivo() {
    return denominaciones.reduce((acc, d) => acc + ((cantidades[d.id] || 0) * d.valor), 0);
  }

  async function handleCerrar() {
    setError("");
    setSaving(true);
    try {
      const denoms = denominaciones.map(d => ({
        id: d.id, valor: d.valor, cantidad: cantidades[d.id] || 0
      }));

      const totalEfectivo = calcularTotalEfectivo();
      const totalTarjeta = parseFloat(montoPorTarjeta || 0);
      const totalTransferencia = parseFloat(montoPorTransferencia || 0);
      const totalGeneral = totalEfectivo + totalTarjeta + totalTransferencia;

      const arqueoRes = await fetch(`${API}/api/arqueo/guardar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sesion_id, denominaciones: denoms, monto_tarjeta: totalTarjeta, monto_transferencia: totalTransferencia })
      });
      if (!arqueoRes.ok) throw new Error("Error al guardar arqueo");

      const cierreRes = await fetch(`${API}/api/cajas/cerrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sesion_id, monto_cierre_real: totalGeneral,
          monto_efectivo: totalEfectivo, monto_tarjeta: totalTarjeta,
          monto_transferencia: totalTransferencia, usuario_id: user.id
        })
      });
      const cierreData = await cierreRes.json();
      if (!cierreRes.ok) throw new Error(cierreData.message);

      router.push(`/cajero/resumen?sesion_id=${sesion_id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>;

  const totalEfectivo = calcularTotalEfectivo();
  const totalTarjeta = parseFloat(montoPorTarjeta || 0);
  const totalTransferencia = parseFloat(montoPorTransferencia || 0);
  const totalGeneral = totalEfectivo + totalTarjeta + totalTransferencia;

  const montoApertura = Number(sesionInfo?.monto_apertura || 0);
  const ventasEfectivo = Number(ventasSesion?.total_efectivo || 0);
  const efectivoEsperado = montoApertura + ventasEfectivo;

  const descuadreEfectivo = totalEfectivo - efectivoEsperado;
  const descuadreTarjeta = ventasSesion ? totalTarjeta - Number(ventasSesion.total_tarjeta || 0) : 0;
  const descuadreTransferencia = ventasSesion ? totalTransferencia - Number(ventasSesion.total_transferencia || 0) : 0;

  const cxcTotal = Number(cxcResumen?.total_cobrado || 0);
  const cxcEfectivo = Number(cxcResumen?.por_metodo?.efectivo || 0);
  const cxcTarjeta = Number(cxcResumen?.por_metodo?.tarjeta || 0);
  const cxcTransferencia = Number(cxcResumen?.por_metodo?.transferencia || 0);
  const cxcCantidad = (cxcResumen?.cuentas || []).length;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-lg mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold"><span className="text-white">SLOT</span><span className="text-amber-400"> SYSTEM</span></h1>
            <p className="text-slate-400 text-sm mt-1">Arqueo de caja</p>
          </div>
          <button onClick={() => router.push("/cajero/caja")} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm hover:border-amber-400/50 transition-all">← Volver</button>
        </div>

        {/* Resumen esperado del sistema */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">Resumen esperado del sistema</p>
          <div className="flex flex-col gap-2">
            {montoApertura > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">💼 Apertura de caja</span>
                <span className="text-white font-medium">RD${montoApertura.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">💵 Ventas en efectivo</span>
              <span className="text-green-400 font-medium">RD${ventasEfectivo.toFixed(2)}</span>
            </div>
            {montoApertura > 0 && (
              <div className="flex justify-between text-sm border-t border-slate-700 pt-2 mt-1">
                <span className="text-white font-semibold">Total efectivo esperado</span>
                <span className="text-amber-400 font-bold">RD${efectivoEsperado.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm mt-1">
              <span className="text-slate-400">💳 Tarjeta esperado</span>
              <span className="text-blue-400 font-medium">RD${Number(ventasSesion?.total_tarjeta || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">📱 Transferencia esperado</span>
              <span className="text-purple-400 font-medium">RD${Number(ventasSesion?.total_transferencia || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Cuentas por cobrar cobradas */}
        {cxcCantidad > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-5 mb-4">
            <p className="text-xs text-orange-300 uppercase tracking-widest mb-3">📋 Cuentas por cobrar cobradas este turno</p>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total cobrado CxC</span>
                <span className="text-orange-400 font-bold">RD${cxcTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Cantidad de cuentas</span>
                <span className="text-white">{cxcCantidad}</span>
              </div>
              {cxcEfectivo > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">💵 Efectivo CxC</span>
                  <span className="text-green-400">RD${cxcEfectivo.toFixed(2)}</span>
                </div>
              )}
              {cxcTarjeta > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">💳 Tarjeta CxC</span>
                  <span className="text-blue-400">RD${cxcTarjeta.toFixed(2)}</span>
                </div>
              )}
              {cxcTransferencia > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">📱 Transferencia CxC</span>
                  <span className="text-purple-400">RD${cxcTransferencia.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <p className="text-slate-400 text-sm mb-3">💵 Cuenta los billetes y monedas e ingresa la cantidad de cada denominación:</p>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-4">
          <div className="grid grid-cols-3 px-6 py-3 border-b border-slate-800">
            <p className="text-xs text-slate-400 uppercase tracking-widest">Denominación</p>
            <p className="text-xs text-slate-400 uppercase tracking-widest text-center">Cantidad</p>
            <p className="text-xs text-slate-400 uppercase tracking-widest text-right">Subtotal</p>
          </div>
          {denominaciones.map(d => (
            <div key={d.id} className="grid grid-cols-3 items-center px-6 py-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-all">
              <p className="text-white font-medium">RD${Number(d.valor).toLocaleString()}</p>
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => setCantidades(prev => ({ ...prev, [d.id]: Math.max(0, (prev[d.id] || 0) - 1) }))}
                  className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all">−</button>
                <input type="number" min="0" value={cantidades[d.id] || 0}
                  onChange={e => setCantidades(prev => ({ ...prev, [d.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="w-14 text-center bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-sm outline-none focus:border-amber-400" />
                <button onClick={() => setCantidades(prev => ({ ...prev, [d.id]: (prev[d.id] || 0) + 1 }))}
                  className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all">+</button>
              </div>
              <p className="text-right text-amber-400 font-medium">RD${((cantidades[d.id] || 0) * d.valor).toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-4">Otros métodos de pago</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest">💳 Total cobrado por tarjeta (RD$)</label>
              <input type="number" step="0.01" value={montoPorTarjeta}
                onChange={e => setMontoPorTarjeta(e.target.value)} placeholder="0.00"
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest">📱 Total cobrado por transferencia (RD$)</label>
              <input type="number" step="0.01" value={montoPorTransferencia}
                onChange={e => setMontoPorTransferencia(e.target.value)} placeholder="0.00"
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
            </div>
          </div>
        </div>

        {/* Resumen con descuadres */}
        <div className="bg-slate-900 border border-amber-400/30 rounded-2xl p-5 mb-6">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">Resumen del arqueo</p>
          <div className="flex flex-col gap-3 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">💵 Efectivo contado</span>
              <div className="text-right">
                <p className="text-green-400 font-bold text-sm">RD${totalEfectivo.toFixed(2)}</p>
                <p className="text-xs text-slate-500">Esperado: RD${efectivoEsperado.toFixed(2)}</p>
                <p className={`text-xs font-medium ${descuadreEfectivo === 0 ? "text-green-400" : descuadreEfectivo > 0 ? "text-blue-400" : "text-red-400"}`}>
                  {descuadreEfectivo === 0 ? "✓ Cuadrado" : descuadreEfectivo > 0 ? `+RD$${descuadreEfectivo.toFixed(2)} sobrante` : `RD$${Math.abs(descuadreEfectivo).toFixed(2)} faltante`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">💳 Tarjeta</span>
              <div className="text-right">
                <p className="text-blue-400 font-bold text-sm">RD${totalTarjeta.toFixed(2)}</p>
                {montoPorTarjeta !== "" && (
                  <p className={`text-xs font-medium ${descuadreTarjeta === 0 ? "text-green-400" : descuadreTarjeta > 0 ? "text-blue-400" : "text-red-400"}`}>
                    {descuadreTarjeta === 0 ? "✓ Cuadrado" : descuadreTarjeta > 0 ? `+RD$${descuadreTarjeta.toFixed(2)} sobrante` : `RD$${Math.abs(descuadreTarjeta).toFixed(2)} faltante`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">📱 Transferencia</span>
              <div className="text-right">
                <p className="text-purple-400 font-bold text-sm">RD${totalTransferencia.toFixed(2)}</p>
                {montoPorTransferencia !== "" && (
                  <p className={`text-xs font-medium ${descuadreTransferencia === 0 ? "text-green-400" : descuadreTransferencia > 0 ? "text-blue-400" : "text-red-400"}`}>
                    {descuadreTransferencia === 0 ? "✓ Cuadrado" : descuadreTransferencia > 0 ? `+RD$${descuadreTransferencia.toFixed(2)} sobrante` : `RD$${Math.abs(descuadreTransferencia).toFixed(2)} faltante`}
                  </p>
                )}
              </div>
            </div>

            {cxcTotal > 0 && (
              <div className="flex items-center justify-between border-t border-slate-700 pt-3">
                <span className="text-orange-300 text-sm">📋 CxC cobradas</span>
                <p className="text-orange-400 font-bold text-sm">RD${cxcTotal.toFixed(2)}</p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-700 pt-3 flex items-center justify-between">
            <p className="text-slate-300 font-semibold">Total general</p>
            <p className="text-3xl font-bold text-amber-400">RD${totalGeneral.toFixed(2)}</p>
          </div>
        </div>

        <button onClick={handleCerrar} disabled={saving}
          className="w-full py-4 rounded-xl font-semibold text-sm bg-red-500 text-white hover:bg-red-400 transition-all disabled:opacity-60">
          {saving ? "Cerrando caja..." : "✕ Confirmar cierre y cerrar caja"}
        </button>
      </div>
    </div>
  );
}

export default function ArqueoPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>}>
      <ArqueoPage />
    </Suspense>
  );
}