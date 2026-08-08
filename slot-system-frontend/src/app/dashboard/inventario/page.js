"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function InventarioPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("inventario");
  const [inventario, setInventario] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [suplidores, setSuplidores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [showAjuste, setShowAjuste] = useState(null);
  const [showMovimientos, setShowMovimientos] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nombre: "", sku: "", categoria_inventario_id: "", unidad_medida_id: "",
    stock_actual: "", stock_minimo: "", costo_unitario: "", precio_estimado: "",
    fecha_entrada: "", fecha_vencimiento: "", suplidor_id: "", ubicacion: "", notas: "",
    es_ingrediente: false
  });
  const [ajuste, setAjuste] = useState({ cantidad: "", tipo: "compra", notas: "" });
  const [formCategoria, setFormCategoria] = useState({ nombre: "", color: "#6366F1" });
  const [formSuplidor, setFormSuplidor] = useState({ nombre: "", telefono: "", email: "", direccion: "", notas: "" });
  const [formUnidad, setFormUnidad] = useState({ nombre: "", abreviacion: "" });

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/"); return; }
    cargarDatos();
  }, [user, authLoading]);

  async function cargarDatos() {
    try {
      const [invRes, catRes, uniRes, supRes] = await Promise.all([
        fetch(`${API}/api/inventario?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/categorias-inventario?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/inventario/unidades`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/suplidores?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [invData, catData, uniData, supData] = await Promise.all([invRes.json(), catRes.json(), uniRes.json(), supRes.json()]);
      setInventario(invData.inventario || []);
      setCategorias(catData.categorias || []);
      setUnidades(uniData.unidades || []);
      setSuplidores(supData.suplidores || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function guardarIngrediente(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const url = editando ? `${API}/api/inventario/${editando.id}` : `${API}/api/inventario`;
      const method = editando ? "PUT" : "POST";
      const body = editando ? form : { ...form, business_id: user.business_id };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (editando) setInventario(inventario.map(i => i.id === editando.id ? { ...data.ingrediente, estado_calculado: calcularEstado(data.ingrediente) } : i));
      else setInventario([{ ...data.ingrediente, estado_calculado: calcularEstado(data.ingrediente) }, ...inventario]);
      setShowForm(false);
      setEditando(null);
      resetForm();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function guardarAjuste(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/inventario/${showAjuste.id}/ajustar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...ajuste, usuario_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const actualizado = { ...data.ingrediente, estado_calculado: calcularEstado(data.ingrediente) };
      setInventario(inventario.map(i => i.id === showAjuste.id ? actualizado : i));
      setShowAjuste(null);
      setAjuste({ cantidad: "", tipo: "compra", notas: "" });
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function guardarCategoria(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/categorias-inventario`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formCategoria, business_id: user.business_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCategorias([...categorias, data.categoria]);
      setFormCategoria({ nombre: "", color: "#6366F1" });
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function eliminarCategoria(id) {
    if (!confirm("¿Eliminar esta categoría?")) return;
    await fetch(`${API}/api/categorias-inventario/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setCategorias(categorias.filter(c => c.id !== id));
  }

  async function guardarSuplidor(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/suplidores`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formSuplidor, business_id: user.business_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuplidores([...suplidores, data.suplidor]);
      setFormSuplidor({ nombre: "", telefono: "", email: "", direccion: "", notas: "" });
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function eliminarSuplidor(id) {
    if (!confirm("¿Eliminar este suplidor?")) return;
    await fetch(`${API}/api/suplidores/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setSuplidores(suplidores.filter(s => s.id !== id));
  }

  async function guardarUnidad(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/inventario/unidades`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formUnidad),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setUnidades([...unidades, data.unidad]);
      setFormUnidad({ nombre: "", abreviacion: "" });
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function eliminarUnidad(id) {
    if (!confirm("¿Eliminar esta unidad?")) return;
    await fetch(`${API}/api/inventario/unidades/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setUnidades(unidades.filter(u => u.id !== id));
  }

  async function verMovimientos(item) {
    setShowMovimientos(item);
    const res = await fetch(`${API}/api/inventario/movimientos?inventario_id=${item.id}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setMovimientos(data.movimientos || []);
  }

  function calcularEstado(item) {
    const stock = Number(item.stock_actual);
    const minimo = Number(item.stock_minimo);
    if (stock <= 0) return "agotado";
    if (stock <= minimo) return "bajo";
    return "disponible";
  }

  function resetForm() {
    setForm({ nombre: "", sku: "", categoria_inventario_id: "", unidad_medida_id: "", stock_actual: "", stock_minimo: "", costo_unitario: "", precio_estimado: "", fecha_entrada: "", fecha_vencimiento: "", suplidor_id: "", ubicacion: "", notas: "", es_ingrediente: false });
  }

  function editarIngrediente(item) {
    setEditando(item);
    setForm({
      nombre: item.nombre || "", sku: item.sku || "",
      categoria_inventario_id: item.categoria_inventario_id || "",
      unidad_medida_id: item.unidad_medida_id || "",
      stock_actual: item.stock_actual || "", stock_minimo: item.stock_minimo || "",
      costo_unitario: item.costo_unitario || "", precio_estimado: item.precio_estimado || "",
      fecha_entrada: item.fecha_entrada || "", fecha_vencimiento: item.fecha_vencimiento || "",
      suplidor_id: item.suplidor_id || "", ubicacion: item.ubicacion || "", notas: item.notas || "",
      es_ingrediente: item.es_ingrediente || false
    });
    setShowForm(true);
    setTab("inventario");
  }

  const estadoBadge = (item) => {
    const e = item.estado_calculado;
    if (e === "agotado") return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-500/30">Agotado</span>;
    if (e === "bajo") return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-900/30 text-amber-400 border border-amber-500/30">Stock bajo</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/30">Disponible</span>;
  };

  const inventarioFiltrado = inventario.filter(i => {
    if (filtroCategoria && i.categoria_inventario_id !== filtroCategoria) return false;
    if (filtroEstado && i.estado_calculado !== filtroEstado) return false;
    if (busqueda && !i.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  const stockBajo = inventario.filter(i => i.estado_calculado === "bajo" || i.estado_calculado === "agotado");
  const valorTotal = inventario.reduce((acc, i) => acc + (Number(i.stock_actual) * Number(i.costo_unitario)), 0);

  if (authLoading || loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold"><span className="text-white">SLOT</span><span className="text-amber-400"> SYSTEM</span></h1>
            <p className="text-slate-400 text-sm mt-1">Inventario</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push("/dashboard")} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm hover:border-amber-400/50 transition-all">← Dashboard</button>
            {tab === "inventario" && (
              <button onClick={() => { setShowForm(!showForm); setEditando(null); resetForm(); setError(""); }}
                className="px-4 py-2 bg-amber-400 text-slate-900 rounded-xl text-sm font-semibold hover:bg-amber-300 transition-all">
                {showForm ? "Cancelar" : "+ Nuevo item"}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Total items</p>
            <p className="text-2xl font-bold text-white">{inventario.length}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Stock bajo</p>
            <p className="text-2xl font-bold text-amber-400">{stockBajo.length}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Agotados</p>
            <p className="text-2xl font-bold text-red-400">{inventario.filter(i => i.estado_calculado === "agotado").length}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Valor total</p>
            <p className="text-2xl font-bold text-green-400">RD${valorTotal.toFixed(0)}</p>
          </div>
        </div>

        {stockBajo.length > 0 && (
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-4 mb-6">
            <p className="text-amber-400 font-semibold text-sm mb-2">⚠ {stockBajo.length} item(s) con stock bajo o agotado</p>
            <div className="flex flex-wrap gap-2">
              {stockBajo.map(i => (
                <span key={i.id} className={`px-3 py-1 rounded-full text-xs ${i.estado_calculado === "agotado" ? "bg-red-900/30 text-red-400" : "bg-amber-900/30 text-amber-400"}`}>
                  {i.nombre} ({i.stock_actual} {i.unidades_medida?.abreviacion})
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex bg-slate-800 rounded-xl p-1 mb-6 w-fit">
          {[
            { id: "inventario", label: "Inventario" },
            { id: "categorias", label: "Categorías" },
            { id: "suplidores", label: "Suplidores" },
            { id: "unidades", label: "Unidades" },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setShowForm(false); }}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-amber-400 text-slate-900" : "text-slate-400 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {error && <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 mb-4"><p className="text-sm text-red-400">{error}</p></div>}

        {tab === "inventario" && (
          <>
            {showForm && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">{editando ? "Editar item" : "Nuevo item de inventario"}</h2>
                <form onSubmit={guardarIngrediente} className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400 uppercase tracking-widest">Nombre</label>
                    <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest">SKU / Código</label>
                    <input type="text" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })}
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest">Categoría</label>
                    <select value={form.categoria_inventario_id} onChange={e => setForm({ ...form, categoria_inventario_id: e.target.value })}
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400">
                      <option value="">Sin categoría</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest">Unidad de medida</label>
                    <select value={form.unidad_medida_id} onChange={e => setForm({ ...form, unidad_medida_id: e.target.value })} required
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400">
                      <option value="">Seleccionar</option>
                      {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.abreviacion})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest">Suplidor</label>
                    <select value={form.suplidor_id} onChange={e => setForm({ ...form, suplidor_id: e.target.value })}
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400">
                      <option value="">Sin suplidor</option>
                      {suplidores.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest">Stock actual</label>
                    <input type="number" value={form.stock_actual} onChange={e => setForm({ ...form, stock_actual: e.target.value })} required
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest">Stock mínimo</label>
                    <input type="number" value={form.stock_minimo} onChange={e => setForm({ ...form, stock_minimo: e.target.value })} required
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest">Costo unitario (RD$)</label>
                    <input type="number" value={form.costo_unitario} onChange={e => setForm({ ...form, costo_unitario: e.target.value })}
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest">Precio estimado (RD$)</label>
                    <input type="number" value={form.precio_estimado} onChange={e => setForm({ ...form, precio_estimado: e.target.value })}
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest">Fecha entrada</label>
                    <input type="date" value={form.fecha_entrada} onChange={e => setForm({ ...form, fecha_entrada: e.target.value })}
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest">Fecha vencimiento</label>
                    <input type="date" value={form.fecha_vencimiento} onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })}
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-widest">Ubicación</label>
                    <input type="text" value={form.ubicacion} onChange={e => setForm({ ...form, ubicacion: e.target.value })} placeholder="Almacén, nevera..."
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs text-slate-400 uppercase tracking-widest">Notas internas</label>
                    <input type="text" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                  </div>
                  <div className="col-span-3 flex items-center gap-3">
                    <input type="checkbox" id="es_ingrediente" checked={form.es_ingrediente || false}
                      onChange={e => setForm({ ...form, es_ingrediente: e.target.checked })}
                      className="w-4 h-4 accent-amber-400" />
                    <label htmlFor="es_ingrediente" className="text-sm text-slate-300">
                      Este item es un ingrediente (aparecerá en recetas)
                    </label>
                  </div>
                  <div className="col-span-3">
                    <button type="submit" disabled={saving} className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-60">
                      {saving ? "Guardando..." : editando ? "Guardar cambios" : "Crear item"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="flex gap-3 mb-4 flex-wrap">
              <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar item..."
                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-amber-400 w-64" />
              <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-amber-400">
                <option value="">Todas las categorías</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-amber-400">
                <option value="">Todos los estados</option>
                <option value="disponible">Disponible</option>
                <option value="bajo">Stock bajo</option>
                <option value="agotado">Agotado</option>
              </select>
              {(busqueda || filtroCategoria || filtroEstado) && (
                <button onClick={() => { setBusqueda(""); setFiltroCategoria(""); setFiltroEstado(""); }}
                  className="px-4 py-2 rounded-xl text-sm border border-slate-700 text-slate-400 hover:text-white transition-all">
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              {inventarioFiltrado.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No hay items que coincidan</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Item</th>
                      <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Categoría</th>
                      <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Stock</th>
                      <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Costo</th>
                      <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Suplidor</th>
                      <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Estado</th>
                      <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventarioFiltrado.map(item => (
                      <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-all">
                        <td className="px-6 py-4">
                          <p className="text-white font-medium">{item.nombre}</p>
                          <p className="text-slate-500 text-xs">
                            {item.sku || "—"} {item.ubicacion ? `· ${item.ubicacion}` : ""}
                            {item.es_ingrediente && <span className="ml-2 px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-400 text-xs">Ingrediente</span>}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          {item.categorias_inventario ? (
                            <span className="px-2 py-1 rounded-full text-xs text-white" style={{ backgroundColor: item.categorias_inventario.color + "99" }}>
                              {item.categorias_inventario.nombre}
                            </span>
                          ) : <span className="text-slate-500 text-xs">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <p className={`font-semibold ${item.estado_calculado === "agotado" ? "text-red-400" : item.estado_calculado === "bajo" ? "text-amber-400" : "text-white"}`}>
                            {item.stock_actual} {item.unidades_medida?.abreviacion}
                          </p>
                          <p className="text-slate-500 text-xs">Mín: {item.stock_minimo}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">RD${Number(item.costo_unitario).toFixed(2)}</td>
                        <td className="px-6 py-4 text-slate-400 text-sm">{item.suplidores?.nombre || "—"}</td>
                        <td className="px-6 py-4">{estadoBadge(item)}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => editarIngrediente(item)}
                              className="px-3 py-1 rounded-lg text-xs border border-slate-600 text-slate-300 hover:border-amber-400/50 hover:text-amber-400 transition-all">Editar</button>
                            <button onClick={() => setShowAjuste(item)}
                              className="px-3 py-1 rounded-lg text-xs border border-blue-500/30 text-blue-400 hover:bg-blue-900/20 transition-all">Ajustar</button>
                            <button onClick={() => verMovimientos(item)}
                              className="px-3 py-1 rounded-lg text-xs border border-slate-600 text-slate-400 hover:text-white transition-all">Historial</button>
                            <button onClick={async () => {
                              if (!confirm("¿Eliminar este item?")) return;
                              await fetch(`${API}/api/inventario/${item.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
                              setInventario(inventario.filter(i => i.id !== item.id));
                            }} className="px-3 py-1 rounded-lg text-xs border border-red-500/30 text-red-400 hover:bg-red-900/20 transition-all">Eliminar</button>
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

        {tab === "categorias" && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Nueva categoría</h2>
              <form onSubmit={guardarCategoria} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest">Nombre</label>
                  <input type="text" value={formCategoria.nombre} onChange={e => setFormCategoria({ ...formCategoria, nombre: e.target.value })} required
                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest">Color</label>
                  <input type="color" value={formCategoria.color} onChange={e => setFormCategoria({ ...formCategoria, color: e.target.value })}
                    className="w-full mt-1 h-12 bg-slate-800 border border-slate-700 rounded-xl px-2 cursor-pointer" />
                </div>
                <button type="submit" disabled={saving} className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-60">
                  {saving ? "Guardando..." : "Crear categoría"}
                </button>
              </form>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Categorías creadas</h2>
              {categorias.length === 0 ? <p className="text-slate-500 text-sm">No hay categorías aún</p> : (
                <div className="flex flex-col gap-3">
                  {categorias.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color }}></div>
                        <p className="text-white text-sm font-medium">{c.nombre}</p>
                      </div>
                      <button onClick={() => eliminarCategoria(c.id)} className="text-xs text-red-400 hover:text-red-300 transition-all">Eliminar</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "suplidores" && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Nuevo suplidor</h2>
              <form onSubmit={guardarSuplidor} className="flex flex-col gap-4">
                {[
                  { key: "nombre", label: "Nombre", required: true },
                  { key: "telefono", label: "Teléfono" },
                  { key: "email", label: "Email", type: "email" },
                  { key: "direccion", label: "Dirección" },
                  { key: "notas", label: "Notas" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-slate-400 uppercase tracking-widest">{f.label}</label>
                    <input type={f.type || "text"} value={formSuplidor[f.key]} onChange={e => setFormSuplidor({ ...formSuplidor, [f.key]: e.target.value })} required={f.required}
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                  </div>
                ))}
                <button type="submit" disabled={saving} className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-60">
                  {saving ? "Guardando..." : "Crear suplidor"}
                </button>
              </form>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Suplidores registrados</h2>
              {suplidores.length === 0 ? <p className="text-slate-500 text-sm">No hay suplidores aún</p> : (
                <div className="flex flex-col gap-3">
                  {suplidores.map(s => (
                    <div key={s.id} className="p-3 bg-slate-800/50 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-white text-sm font-medium">{s.nombre}</p>
                        <button onClick={() => eliminarSuplidor(s.id)} className="text-xs text-red-400 hover:text-red-300 transition-all">Eliminar</button>
                      </div>
                      <p className="text-slate-400 text-xs">{s.telefono || "—"} · {s.email || "—"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "unidades" && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Nueva unidad de medida</h2>
              <form onSubmit={guardarUnidad} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest">Nombre</label>
                  <input type="text" value={formUnidad.nombre} onChange={e => setFormUnidad({ ...formUnidad, nombre: e.target.value })} required placeholder="Ej: Libras"
                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest">Abreviación</label>
                  <input type="text" value={formUnidad.abreviacion} onChange={e => setFormUnidad({ ...formUnidad, abreviacion: e.target.value })} required placeholder="Ej: lb"
                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                </div>
                <button type="submit" disabled={saving} className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-60">
                  {saving ? "Guardando..." : "Crear unidad"}
                </button>
              </form>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Unidades registradas</h2>
              <div className="flex flex-col gap-2">
                {unidades.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                    <div>
                      <p className="text-white text-sm font-medium">{u.nombre}</p>
                      <p className="text-slate-400 text-xs">{u.abreviacion}</p>
                    </div>
                    <button onClick={() => eliminarUnidad(u.id)} className="text-xs text-red-400 hover:text-red-300 transition-all">Eliminar</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showAjuste && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-1">Ajustar stock</h2>
              <p className="text-slate-400 text-sm mb-4">{showAjuste.nombre} — Stock: {showAjuste.stock_actual} {showAjuste.unidades_medida?.abreviacion}</p>
              <form onSubmit={guardarAjuste} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest">Tipo</label>
                  <select value={ajuste.tipo} onChange={e => setAjuste({ ...ajuste, tipo: e.target.value })}
                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400">
                    <option value="compra">Compra (suma)</option>
                    <option value="ajuste">Ajuste manual (reemplaza)</option>
                    <option value="desperdicio">Desperdicio (resta)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest">Cantidad</label>
                  <input type="number" value={ajuste.cantidad} onChange={e => setAjuste({ ...ajuste, cantidad: e.target.value })} required
                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest">Notas</label>
                  <input type="text" value={ajuste.notas} onChange={e => setAjuste({ ...ajuste, notas: e.target.value })} placeholder="Opcional"
                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-60">
                    {saving ? "Guardando..." : "Confirmar"}
                  </button>
                  <button type="button" onClick={() => setShowAjuste(null)} className="flex-1 py-3 rounded-xl text-sm border border-slate-700 hover:border-slate-500 transition-all">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showMovimientos && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Historial — {showMovimientos.nombre}</h2>
                <button onClick={() => setShowMovimientos(null)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              {movimientos.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">Sin movimientos registrados</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {movimientos.map(m => (
                    <div key={m.id} className="bg-slate-800/50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          m.tipo === "compra" ? "bg-green-900/30 text-green-400" :
                          m.tipo === "venta" ? "bg-blue-900/30 text-blue-400" :
                          m.tipo === "desperdicio" ? "bg-red-900/30 text-red-400" :
                          "bg-slate-700 text-slate-300"
                        }`}>{m.tipo}</span>
                        <span className="text-slate-400 text-xs">{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-white text-sm">Cantidad: {m.cantidad}</p>
                      {m.notas && <p className="text-slate-400 text-xs mt-1">{m.notas}</p>}
                      {m.users && <p className="text-slate-500 text-xs">{m.users.nombre} {m.users.apellido}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}