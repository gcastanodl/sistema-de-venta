"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function UsuariosPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "", password: "", telefono: "", pin_pos: "", rol_id: "", sucursal_id: "" });
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
      const [usRes, rolRes, sucRes] = await Promise.all([
        fetch(`${API}/api/usuarios?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/usuarios/roles`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/sucursales?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const usData = await usRes.json();
      const rolData = await rolRes.json();
      const sucData = await sucRes.json();
      setUsuarios(usData.usuarios || []);
      setRoles(rolData.roles || []);
      setSucursales(sucData.sucursales || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function abrirFormNuevo() {
    setEditando(null);
    setForm({ nombre: "", apellido: "", email: "", password: "", telefono: "", pin_pos: "", rol_id: "", sucursal_id: "" });
    setShowForm(true);
    setError("");
  }

  function abrirFormEditar(u) {
    setEditando(u);
    setForm({ nombre: u.nombre, apellido: u.apellido, email: u.email || "", password: "", telefono: u.telefono || "", pin_pos: u.pin_pos || "", rol_id: u.rol_id, sucursal_id: u.sucursal_id || "" });
    setShowForm(true);
    setError("");
  }

  async function guardar(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const url = editando ? `${API}/api/usuarios/${editando.id}` : `${API}/api/usuarios`;
      const method = editando ? "PUT" : "POST";
      const body = editando 
  ? { ...form, sucursal_id: form.sucursal_id || null }
  : { ...form, business_id: user.business_id, sucursal_id: form.sucursal_id || null };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      if (editando) {
        setUsuarios(usuarios.map(u => u.id === editando.id ? data.usuario : u));
      } else {
        setUsuarios([data.usuario, ...usuarios]);
      }
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function desactivar(id) {
    if (!confirm("¿Desactivar este usuario?")) return;
    try {
      await fetch(`${API}/api/usuarios/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsuarios(usuarios.map(u => u.id === id ? { ...u, estado: "inactivo" } : u));
    } catch (err) {
      console.error(err);
    }
  }

  if (authLoading || loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold"><span className="text-white">SLOT</span><span className="text-amber-400"> SYSTEM</span></h1>
            <p className="text-slate-400 text-sm mt-1">Gestión de usuarios</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push("/dashboard")} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm hover:border-amber-400/50 transition-all">← Dashboard</button>
            <button onClick={abrirFormNuevo} className="px-4 py-2 bg-amber-400 text-slate-900 rounded-xl text-sm font-semibold hover:bg-amber-300 transition-all">+ Nuevo usuario</button>
          </div>
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">{editando ? "Editar usuario" : "Nuevo usuario"}</h2>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <form onSubmit={guardar} className="grid grid-cols-2 gap-4">
              {[
                { key: "nombre", label: "Nombre", required: true },
                { key: "apellido", label: "Apellido", required: true },
                { key: "email", label: "Email" },
                { key: "password", label: "Contraseña", type: "password" },
                { key: "telefono", label: "Teléfono" },
                { key: "pin_pos", label: "PIN de caja (4-6 dígitos)" },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-xs text-slate-400 uppercase tracking-widest">{field.label}</label>
                  <input
                    type={field.type || "text"}
                    value={form[field.key]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    required={field.required}
                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400"
                  />
                </div>
              ))}

              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Rol</label>
                <select value={form.rol_id} onChange={e => setForm({ ...form, rol_id: e.target.value })} required className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400">
                  <option value="">Seleccionar rol</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Sucursal</label>
                <select value={form.sucursal_id} onChange={e => setForm({ ...form, sucursal_id: e.target.value })} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400">
                  <option value="">Sin sucursal</option>
                  {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>

              <div className="col-span-2 flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-60">
                  {saving ? "Guardando..." : editando ? "Guardar cambios" : "Crear usuario"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl text-sm border border-slate-700 hover:border-slate-500 transition-all">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabla */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {usuarios.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No hay usuarios registrados</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Usuario</th>
                  <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Rol</th>
                  <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">PIN</th>
                  <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Estado</th>
                  <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-all">
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{u.nombre} {u.apellido}</p>
                      <p className="text-slate-400 text-xs">{u.email || "Sin email"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-900/30 text-amber-400 border border-amber-500/30">
                        {u.roles?.nombre}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{u.pin_pos ? "****" : "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.estado === "activo" ? "bg-green-900/30 text-green-400 border border-green-500/30" : "bg-red-900/30 text-red-400 border border-red-500/30"}`}>
                        {u.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <button onClick={() => abrirFormEditar(u)} className="px-3 py-1 rounded-lg text-xs border border-slate-600 text-slate-300 hover:border-amber-400/50 hover:text-amber-400 transition-all">
                        Editar
                      </button>
                      {u.estado === "activo" && (
                        <button onClick={() => desactivar(u.id)} className="px-3 py-1 rounded-lg text-xs border border-red-500/30 text-red-400 hover:bg-red-900/20 transition-all">
                          Desactivar
                        </button>
                      )}
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