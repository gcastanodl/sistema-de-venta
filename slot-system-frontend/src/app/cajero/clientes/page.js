"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function ClientesCajeroPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: "", telefono: "", email: "" });

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/"); return; }
    cargarClientes();
  }, [user, authLoading]);

  async function cargarClientes() {
    try {
      const res = await fetch(`${API}/api/clientes?business_id=${user.business_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setClientes(data.clientes || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function crearCliente(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/clientes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, business_id: user.business_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setClientes([data.cliente, ...clientes]);
      setForm({ nombre: "", telefono: "", email: "" });
      setShowForm(false);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono?.includes(busqueda) ||
    c.email?.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (authLoading || loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold"><span className="text-white">SLOT</span><span className="text-amber-400"> SYSTEM</span></h1>
            <p className="text-slate-400 text-sm mt-1">Clientes</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push("/cajero")} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm hover:border-amber-400/50 transition-all">← Volver</button>
            <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-amber-400 text-slate-900 rounded-xl text-sm font-semibold hover:bg-amber-300 transition-all">
              {showForm ? "Cancelar" : "+ Nuevo cliente"}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Nuevo cliente</h2>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <form onSubmit={crearCliente} className="flex flex-col gap-4">
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
              <button type="submit" disabled={saving} className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-60">
                {saving ? "Guardando..." : "Crear cliente"}
              </button>
            </form>
          </div>
        )}

        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, teléfono o email..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400 mb-4" />

        <div className="flex flex-col gap-2">
          {clientesFiltrados.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No hay clientes registrados</p>
          ) : clientesFiltrados.map(c => (
            <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-white font-medium">{c.nombre}</p>
              <p className="text-slate-400 text-sm">{c.telefono || "—"} · {c.email || "—"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}