"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function CajasPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cajas, setCajas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: "", codigo: "", sucursal_id: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/"); return; }
    cargarDatos();
  }, [user, authLoading]);

  async function cargarDatos() {
    try {
      const sucRes = await fetch(`${API}/api/sucursales?business_id=${user.business_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sucData = await sucRes.json();
      setSucursales(sucData.sucursales || []);

      if (sucData.sucursales?.length > 0) {
        const cajasPromises = sucData.sucursales.map(s =>
          fetch(`${API}/api/cajas?sucursal_id=${s.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(r => r.json())
        );
        const cajasResults = await Promise.all(cajasPromises);
        const todasCajas = cajasResults.flatMap(r => r.cajas || []);
        setCajas(todasCajas);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function crearCaja(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/cajas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCajas([...cajas, data.caja]);
      setShowForm(false);
      setForm({ nombre: "", codigo: "", sucursal_id: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold"><span className="text-white">SLOT</span><span className="text-amber-400"> SYSTEM</span></h1>
            <p className="text-slate-400 text-sm mt-1">Cajas registradoras</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push("/dashboard")} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm hover:border-amber-400/50 transition-all">← Dashboard</button>
            <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-amber-400 text-slate-900 rounded-xl text-sm font-semibold hover:bg-amber-300 transition-all">
              {showForm ? "Cancelar" : "+ Nueva caja"}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Nueva caja registradora</h2>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <form onSubmit={crearCaja} className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Nombre</label>
                <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Código</label>
                <input type="text" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} required
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-400 uppercase tracking-widest">Sucursal</label>
                <select value={form.sucursal_id} onChange={e => setForm({ ...form, sucursal_id: e.target.value })} required
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400">
                  <option value="">Seleccionar sucursal</option>
                  {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <button type="submit" disabled={saving} className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-60">
                  {saving ? "Creando..." : "Crear caja"}
                </button>
              </div>
            </form>
          </div>
        )}

        {sucursales.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <p className="text-slate-400">No hay sucursales registradas.</p>
            <button onClick={() => router.push("/dashboard/configuracion")} className="mt-4 px-4 py-2 bg-amber-400 text-slate-900 rounded-xl text-sm font-semibold">
              Crear sucursal
            </button>
          </div>
        ) : cajas.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <p className="text-slate-400">No hay cajas registradas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {cajas.map(c => (
              <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">{c.nombre}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${c.estado === "activa" ? "bg-green-900/30 text-green-400 border border-green-500/30" : "bg-red-900/30 text-red-400 border border-red-500/30"}`}>
                    {c.estado}
                  </span>
                </div>
                <p className="text-slate-400 text-sm">Código: {c.codigo}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}