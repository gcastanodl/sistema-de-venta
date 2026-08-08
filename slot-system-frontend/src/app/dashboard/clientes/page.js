"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function ClientesPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: "", telefono: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/"); return; }
    cargarClientes();
  }, [user, authLoading]);

  async function cargarClientes() {
    try {
      const res = await fetch(`${API}/api/clientes?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setClientes(data.clientes || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function guardar(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const url = editando ? `${API}/api/clientes/${editando.id}` : `${API}/api/clientes`;
      const method = editando ? "PUT" : "POST";
      const body = editando ? form : { ...form, business_id: user.business_id };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (editando) setClientes(clientes.map(c => c.id === editando.id ? data.cliente : c));
      else setClientes([data.cliente, ...clientes]);
      setShowForm(false);
      setEditando(null);
      setForm({ nombre: "", telefono: "", email: "" });
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  if (authLoading || loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold"><span className="text-white">SLOT</span><span className="text-amber-400"> SYSTEM</span></h1>
            <p className="text-slate-400 text-sm mt-1">Clientes</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push("/dashboard")} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm hover:border-amber-400/50 transition-all">← Dashboard</button>
            <button onClick={() => { setShowForm(!showForm); setEditando(null); setError(""); }}
              className="px-4 py-2 bg-amber-400 text-slate-900 rounded-xl text-sm font-semibold hover:bg-amber-300 transition-all">
              {showForm ? "Cancelar" : "+ Nuevo cliente"}
            </button>
          </div>
        </div>

        {error && <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 mb-4"><p className="text-sm text-red-400">{error}</p></div>}

        {showForm && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">{editando ? "Editar cliente" : "Nuevo cliente"}</h2>
            <form onSubmit={guardar} className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Nombre</label>
                <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Teléfono</label>
                <input type="text" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div className="col-span-3">
                <button type="submit" disabled={saving} className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-60">
                  {saving ? "Guardando..." : editando ? "Guardar cambios" : "Crear cliente"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {clientes.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No hay clientes registrados</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Nombre</th>
                  <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Teléfono</th>
                  <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Email</th>
                  <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-all">
                    <td className="px-6 py-4 text-white font-medium">{c.nombre}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{c.telefono || "—"}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{c.email || "—"}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => { setEditando(c); setForm({ nombre: c.nombre, telefono: c.telefono || "", email: c.email || "" }); setShowForm(true); }}
                        className="px-3 py-1 rounded-lg text-xs border border-slate-600 text-slate-300 hover:border-amber-400/50 hover:text-amber-400 transition-all">Editar</button>
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