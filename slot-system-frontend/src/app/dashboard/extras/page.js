"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function ExtrasPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [extras, setExtras] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nombre: "", precio_extra: "", inventario_id: "",
    cantidad_consumida: "", unidad_medida_id: "", notas: "", disponible: true
  });

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/"); return; }
    cargarDatos();
  }, [user, authLoading]);

  async function cargarDatos() {
    try {
      const [extRes, invRes, uniRes] = await Promise.all([
        fetch(`${API}/api/extras?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/inventario?business_id=${user.business_id}&es_ingrediente=true`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/inventario/unidades`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [extData, invData, uniData] = await Promise.all([extRes.json(), invRes.json(), uniRes.json()]);
      setExtras(extData.extras || []);
      setInventario(invData.inventario || []);
      setUnidades(uniData.unidades || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function guardarExtra(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const url = editando ? `${API}/api/extras/${editando.id}` : `${API}/api/extras`;
      const method = editando ? "PUT" : "POST";
      const body = editando ? form : { ...form, business_id: user.business_id };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (editando) setExtras(extras.map(e => e.id === editando.id ? data.extra : e));
      else setExtras([...extras, data.extra]);
      setShowForm(false);
      setEditando(null);
      resetForm();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function eliminarExtra(id) {
    if (!confirm("¿Eliminar este extra?")) return;
    await fetch(`${API}/api/extras/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setExtras(extras.filter(e => e.id !== id));
  }

  async function toggleDisponible(extra) {
    const res = await fetch(`${API}/api/extras/${extra.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...extra, disponible: !extra.disponible }),
    });
    const data = await res.json();
    setExtras(extras.map(e => e.id === extra.id ? data.extra : e));
  }

  function editarExtra(extra) {
    setEditando(extra);
    setForm({
      nombre: extra.nombre || "",
      precio_extra: extra.precio_extra || "",
      inventario_id: extra.inventario_id || "",
      cantidad_consumida: extra.cantidad_consumida || "",
      unidad_medida_id: extra.unidad_medida_id || "",
      notas: extra.notas || "",
      disponible: extra.disponible !== false
    });
    setShowForm(true);
  }

  function resetForm() {
    setForm({ nombre: "", precio_extra: "", inventario_id: "", cantidad_consumida: "", unidad_medida_id: "", notas: "", disponible: true });
  }

  if (authLoading || loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold"><span className="text-white">SLOT</span><span className="text-amber-400"> SYSTEM</span></h1>
            <p className="text-slate-400 text-sm mt-1">Extras & Modifiers</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push("/dashboard")} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm hover:border-amber-400/50 transition-all">← Dashboard</button>
            <button onClick={() => { setShowForm(!showForm); setEditando(null); resetForm(); setError(""); }}
              className="px-4 py-2 bg-amber-400 text-slate-900 rounded-xl text-sm font-semibold hover:bg-amber-300 transition-all">
              {showForm ? "Cancelar" : "+ Nuevo extra"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Total extras</p>
            <p className="text-2xl font-bold text-white">{extras.length}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Disponibles</p>
            <p className="text-2xl font-bold text-green-400">{extras.filter(e => e.disponible).length}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">No disponibles</p>
            <p className="text-2xl font-bold text-red-400">{extras.filter(e => !e.disponible).length}</p>
          </div>
        </div>

        {error && <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 mb-4"><p className="text-sm text-red-400">{error}</p></div>}

        {/* Formulario */}
        {showForm && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">{editando ? "Editar extra" : "Nuevo extra"}</h2>
            <form onSubmit={guardarExtra} className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-slate-400 uppercase tracking-widest">Nombre del extra</label>
                <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required placeholder="Ej: Extra Ron 0.5oz"
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Precio extra (RD$)</label>
                <input type="number" step="0.01" value={form.precio_extra} onChange={e => setForm({ ...form, precio_extra: e.target.value })} required placeholder="Ej: 100"
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Ingrediente del inventario</label>
                <select value={form.inventario_id} onChange={e => setForm({ ...form, inventario_id: e.target.value })}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400">
                  <option value="">No descuenta inventario</option>
                  {inventario.map(i => <option key={i.id} value={i.id}>{i.nombre} (Stock: {i.stock_actual} {i.unidades_medida?.abreviacion})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Cantidad a descontar</label>
                <input type="number" step="0.01" value={form.cantidad_consumida} onChange={e => setForm({ ...form, cantidad_consumida: e.target.value })} placeholder="Ej: 0.5"
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Unidad</label>
                <select value={form.unidad_medida_id} onChange={e => setForm({ ...form, unidad_medida_id: e.target.value })}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400">
                  <option value="">Seleccionar</option>
                  {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.abreviacion})</option>)}
                </select>
              </div>
              <div className="col-span-3">
                <label className="text-xs text-slate-400 uppercase tracking-widest">Notas</label>
                <input type="text" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} placeholder="Opcional"
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div className="col-span-3">
                <button type="submit" disabled={saving} className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-60">
                  {saving ? "Guardando..." : editando ? "Guardar cambios" : "Crear extra"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de extras */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {extras.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No hay extras registrados — crea el primero</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Extra</th>
                  <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Precio</th>
                  <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Descuenta inventario</th>
                  <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Estado</th>
                  <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {extras.map(extra => (
                  <tr key={extra.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-all">
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{extra.nombre}</p>
                      {extra.notas && <p className="text-slate-500 text-xs">{extra.notas}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-amber-400 font-bold">+RD${Number(extra.precio_extra).toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4">
                      {extra.inventario ? (
                        <p className="text-slate-300 text-sm">{extra.cantidad_consumida} {extra.unidades_medida?.abreviacion} de {extra.inventario.nombre}</p>
                      ) : <span className="text-slate-500 text-xs">No descuenta</span>}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleDisponible(extra)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${extra.disponible ? "bg-green-900/30 text-green-400 border-green-500/30" : "bg-red-900/30 text-red-400 border-red-500/30"}`}>
                        {extra.disponible ? "Disponible" : "No disponible"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => editarExtra(extra)}
                          className="px-3 py-1 rounded-lg text-xs border border-slate-600 text-slate-300 hover:border-amber-400/50 hover:text-amber-400 transition-all">Editar</button>
                        <button onClick={() => eliminarExtra(extra.id)}
                          className="px-3 py-1 rounded-lg text-xs border border-red-500/30 text-red-400 hover:bg-red-900/20 transition-all">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}