"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function GastosPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("gastos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroFechaInicio, setFiltroFechaInicio] = useState("");
  const [filtroFechaFin, setFiltroFechaFin] = useState("");
  const [showFormGasto, setShowFormGasto] = useState(false);
  const [showFormCategoria, setShowFormCategoria] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formGasto, setFormGasto] = useState({
    nombre: "", monto: "", fecha: new Date().toISOString().split("T")[0],
    categoria_id: "", notas: ""
  });
  const [formCategoria, setFormCategoria] = useState({ nombre: "", color: "#6B7280" });

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/"); return; }
    cargarDatos();
  }, [user, authLoading]);

  async function cargarDatos() {
    try {
      const [catRes, gastosRes] = await Promise.all([
        fetch(`${API}/api/gastos/categorias?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/gastos?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const catData = await catRes.json();
      const gastosData = await gastosRes.json();
      setCategorias(catData.categorias || []);
      setGastos(gastosData.gastos || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function buscarGastos() {
    setLoading(true);
    try {
      let url = `${API}/api/gastos?business_id=${user.business_id}`;
      if (filtroCategoria) url += `&categoria_id=${filtroCategoria}`;
      if (filtroFechaInicio) url += `&fecha_inicio=${filtroFechaInicio}`;
      if (filtroFechaFin) url += `&fecha_fin=${filtroFechaFin}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setGastos(data.gastos || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function guardarGasto(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const url = editando ? `${API}/api/gastos/${editando.id}` : `${API}/api/gastos`;
      const method = editando ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formGasto, business_id: user.business_id, monto: parseFloat(formGasto.monto) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (editando) setGastos(gastos.map(g => g.id === editando.id ? data.gasto : g));
      else setGastos([data.gasto, ...gastos]);
      setShowFormGasto(false);
      setEditando(null);
      setFormGasto({ nombre: "", monto: "", fecha: new Date().toISOString().split("T")[0], categoria_id: "", notas: "" });
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function eliminarGasto(id) {
    if (!confirm("¿Eliminar este gasto?")) return;
    try {
      const res = await fetch(`${API}/api/gastos/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Error al eliminar");
      setGastos(gastos.filter(g => g.id !== id));
    } catch (err) { setError(err.message); }
  }

  async function guardarCategoria(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/gastos/categorias`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formCategoria, business_id: user.business_id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCategorias([...categorias, data.categoria]);
      setFormCategoria({ nombre: "", color: "#6B7280" });
      setShowFormCategoria(false);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function eliminarCategoria(id) {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      const res = await fetch(`${API}/api/gastos/categorias/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Error al eliminar");
      setCategorias(categorias.filter(c => c.id !== id));
    } catch (err) { setError(err.message); }
  }

  const totalGastos = gastos.reduce((acc, g) => acc + Number(g.monto), 0);

  if (authLoading || loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold"><span className="text-white">SLOT</span><span className="text-amber-400"> SYSTEM</span></h1>
            <p className="text-slate-400 text-sm mt-1">Gastos</p>
          </div>
          <button onClick={() => router.push("/dashboard")} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm hover:border-amber-400/50 transition-all">← Dashboard</button>
        </div>

        <div className="flex bg-slate-800 rounded-xl p-1 mb-6 w-fit">
          {[{ id: "gastos", label: "Gastos" }, { id: "categorias", label: "Categorías" }].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setShowFormGasto(false); setShowFormCategoria(false); setError(""); }}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-amber-400 text-slate-900" : "text-slate-400 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {error && <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 mb-4"><p className="text-sm text-red-400">{error}</p></div>}

        {/* TAB GASTOS */}
        {tab === "gastos" && (
          <>
            {/* Filtros */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 mb-4 flex items-end gap-3 flex-wrap">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Categoría</label>
                <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
                  className="block mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-amber-400">
                  <option value="">Todas</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Desde</label>
                <input type="date" value={filtroFechaInicio} onChange={e => setFiltroFechaInicio(e.target.value)}
                  className="block mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Hasta</label>
                <input type="date" value={filtroFechaFin} onChange={e => setFiltroFechaFin(e.target.value)}
                  className="block mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <button onClick={buscarGastos} className="px-5 py-2 bg-amber-400 text-slate-900 rounded-xl text-sm font-semibold hover:bg-amber-300 transition-all">Filtrar</button>
              <button onClick={() => { setShowFormGasto(!showFormGasto); setEditando(null); setError(""); setFormGasto({ nombre: "", monto: "", fecha: new Date().toISOString().split("T")[0], categoria_id: "", notas: "" }); }}
                className="px-5 py-2 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-400 transition-all ml-auto">
                {showFormGasto ? "Cancelar" : "+ Nuevo gasto"}
              </button>
            </div>

            {/* Formulario nuevo gasto */}
            {showFormGasto && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-4">
                <h2 className="text-lg font-semibold mb-4">{editando ? "Editar gasto" : "Nuevo gasto"}</h2>
                <form onSubmit={guardarGasto} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest">Nombre del gasto</label>
                    <input type="text" value={formGasto.nombre} onChange={e => setFormGasto({ ...formGasto, nombre: e.target.value })} required
                      placeholder="Ej: Compra de insumos"
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest">Monto (RD$)</label>
                    <input type="number" step="0.01" value={formGasto.monto} onChange={e => setFormGasto({ ...formGasto, monto: e.target.value })} required
                      placeholder="0.00"
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest">Fecha</label>
                    <input type="date" value={formGasto.fecha} onChange={e => setFormGasto({ ...formGasto, fecha: e.target.value })} required
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest">Categoría</label>
                    <select value={formGasto.categoria_id} onChange={e => setFormGasto({ ...formGasto, categoria_id: e.target.value })}
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400">
                      <option value="">Sin categoría</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400 uppercase tracking-widest">Notas (opcional)</label>
                    <input type="text" value={formGasto.notas} onChange={e => setFormGasto({ ...formGasto, notas: e.target.value })}
                      placeholder="Descripción adicional..."
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                  </div>
                  <div className="col-span-2">
                    <button type="submit" disabled={saving} className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-60">
                      {saving ? "Guardando..." : editando ? "Guardar cambios" : "Registrar gasto"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Resumen total */}
            {gastos.length > 0 && (
              <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-4 mb-4 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-widest">Total gastos</p>
                  <p className="text-2xl font-bold text-red-400">RD${totalGastos.toFixed(2)}</p>
                </div>
                <p className="text-slate-400 text-sm">{gastos.length} registro{gastos.length !== 1 ? "s" : ""}</p>
              </div>
            )}

            {/* Lista de gastos */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              {gastos.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No hay gastos registrados</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Fecha</th>
                      <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Nombre</th>
                      <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Categoría</th>
                      <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Notas</th>
                      <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Monto</th>
                      <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gastos.map(g => (
                      <tr key={g.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-all">
                        <td className="px-6 py-4 text-sm text-slate-300">{new Date(g.fecha + "T00:00:00").toLocaleDateString("es-DO")}</td>
                        <td className="px-6 py-4 text-sm text-white font-medium">{g.nombre}</td>
                        <td className="px-6 py-4">
                          {g.gasto_categorias ? (
                            <span className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: g.gasto_categorias.color + "99" }}>
                              {g.gasto_categorias.nombre}
                            </span>
                          ) : <span className="text-slate-500 text-xs">Sin categoría</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">{g.notas || "—"}</td>
                        <td className="px-6 py-4 text-sm text-red-400 font-bold">RD${Number(g.monto).toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => {
                              setEditando(g);
                              setFormGasto({ nombre: g.nombre, monto: g.monto, fecha: g.fecha, categoria_id: g.categoria_id || "", notas: g.notas || "" });
                              setShowFormGasto(true);
                            }} className="px-3 py-1 rounded-lg text-xs border border-slate-600 text-slate-300 hover:border-amber-400/50 hover:text-amber-400 transition-all">Editar</button>
                            <button onClick={() => eliminarGasto(g.id)} className="px-3 py-1 rounded-lg text-xs border border-red-500/30 text-red-400 hover:bg-red-900/20 transition-all">Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* TAB CATEGORÍAS */}
        {tab === "categorias" && (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={() => { setShowFormCategoria(!showFormCategoria); setError(""); }}
                className="px-5 py-2 bg-amber-400 text-slate-900 rounded-xl text-sm font-semibold hover:bg-amber-300 transition-all">
                {showFormCategoria ? "Cancelar" : "+ Nueva categoría"}
              </button>
            </div>

            {showFormCategoria && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-4">
                <h2 className="text-lg font-semibold mb-4">Nueva categoría</h2>
                <form onSubmit={guardarCategoria} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest">Nombre</label>
                    <input type="text" value={formCategoria.nombre} onChange={e => setFormCategoria({ ...formCategoria, nombre: e.target.value })} required
                      placeholder="Ej: Suministros, Servicios..."
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest">Color</label>
                    <input type="color" value={formCategoria.color} onChange={e => setFormCategoria({ ...formCategoria, color: e.target.value })}
                      className="w-full mt-1 h-12 bg-slate-800 border border-slate-700 rounded-xl px-2 cursor-pointer" />
                  </div>
                  <div className="col-span-2">
                    <button type="submit" disabled={saving} className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-60">
                      {saving ? "Guardando..." : "Crear categoría"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              {categorias.length === 0 ? (
                <div className="col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">No hay categorías registradas</div>
              ) : categorias.map(c => (
                <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color }}></div>
                    <p className="text-white font-medium">{c.nombre}</p>
                  </div>
                  <button onClick={() => eliminarCategoria(c.id)} className="px-3 py-1 rounded-lg text-xs border border-red-500/30 text-red-400 hover:bg-red-900/20 transition-all">Eliminar</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}