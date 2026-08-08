"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: "", rnc: "", telefono: "", email: "", direccion: "", password: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("sa_token") : null;

  useEffect(() => {
    if (!token) { router.push("/superadmin"); return; }
    cargarNegocios();
  }, []);

  async function cargarNegocios() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/superadmin/negocios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNegocios(data.negocios || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function crearNegocio(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/superadmin/negocios`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setNegocios([data.negocio, ...negocios]);
      setShowForm(false);
      setForm({ nombre: "", rnc: "", telefono: "", email: "", direccion: "", password: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleNegocio(id) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/superadmin/negocios/${id}/toggle`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNegocios(negocios.map(n => n.id === id ? data.negocio : n));
    } catch (err) {
      console.error(err);
    }
  }

  function handleLogout() {
    localStorage.removeItem("sa_token");
    localStorage.removeItem("sa_admin");
    localStorage.removeItem("ss_token");
    localStorage.removeItem("ss_user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.clear();
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">
              <span className="text-white">SLOT</span>
              <span className="text-amber-400"> SYSTEM</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">Panel Super Admin</p>
          </div>
          <button onClick={handleLogout} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm hover:border-red-500/50 hover:text-red-400 transition-all">
            Cerrar sesión
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-slate-400 text-xs uppercase tracking-widest">Total negocios</p>
            <p className="text-3xl font-bold text-white mt-1">{negocios.length}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-slate-400 text-xs uppercase tracking-widest">Activos</p>
            <p className="text-3xl font-bold text-green-400 mt-1">{negocios.filter(n => n.estado === "activo").length}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-slate-400 text-xs uppercase tracking-widest">Inactivos</p>
            <p className="text-3xl font-bold text-red-400 mt-1">{negocios.filter(n => n.estado === "inactivo").length}</p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Negocios registrados</h2>
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-amber-400 text-slate-900 rounded-xl text-sm font-semibold hover:bg-amber-300 transition-all">
            {showForm ? "Cancelar" : "+ Nuevo negocio"}
          </button>
        </div>

        {showForm && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
            <h3 className="text-white font-semibold mb-4">Crear nuevo negocio</h3>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <form onSubmit={crearNegocio} className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Nombre del negocio *</label>
                <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Email admin *</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Contraseña admin *</label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">RNC</label>
                <input type="text" value={form.rnc} onChange={e => setForm({ ...form, rnc: e.target.value })}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Teléfono</label>
                <input type="text" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Dirección</label>
                <input type="text" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div className="col-span-2">
                <button type="submit" disabled={saving}
                  className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-60">
                  {saving ? "Creando..." : "Crear negocio"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Cargando...</div>
          ) : negocios.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No hay negocios registrados aún</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Negocio</th>
                  <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Email</th>
                  <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">RNC</th>
                  <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Estado</th>
                  <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Acción</th>
                </tr>
              </thead>
              <tbody>
                {negocios.map(n => (
                  <tr key={n.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-all">
                    <td className="px-6 py-4 text-white font-medium">{n.nombre}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{n.email}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{n.rnc || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${n.estado === "activo" ? "bg-green-900/30 text-green-400 border border-green-500/30" : "bg-red-900/30 text-red-400 border border-red-500/30"}`}>
                        {n.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleNegocio(n.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${n.estado === "activo" ? "border-red-500/30 text-red-400 hover:bg-red-900/20" : "border-green-500/30 text-green-400 hover:bg-green-900/20"}`}>
                        {n.estado === "activo" ? "Desactivar" : "Activar"}
                      </button>
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