"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function MenuPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("productos");
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [formProducto, setFormProducto] = useState({
    nombre: "", descripcion: "", precio: "",
    categoria_id: "", itbis: true, disponible: true,
    kitchen_station: "cocina", tiempo_preparacion: 0,
    inventario_id: "", cantidad_consumida: 1
  });
  const [formCategoria, setFormCategoria] = useState({ nombre: "", color: "#F59E0B" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showReceta, setShowReceta] = useState(null);
  const [receta, setReceta] = useState([]);
  const [ingredientes, setIngredientes] = useState([]);
  const [unidades, setUnidades] = useState([]);

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/"); return; }
    cargarDatos();
  }, [user, authLoading]);

  async function cargarDatos() {
    try {
      const [catRes, prodRes, invRes] = await Promise.all([
        fetch(`${API}/api/categorias?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/productos?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/inventario?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const catData = await catRes.json();
      const prodData = await prodRes.json();
      const invData = await invRes.json();
      setCategorias(catData.categorias || []);
      setProductos(prodData.productos || []);
      setInventario(invData.inventario || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function guardarProducto(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const url = editando ? `${API}/api/productos/${editando.id}` : `${API}/api/productos`;
      const method = editando ? "PUT" : "POST";
      const body = editando ? formProducto : { ...formProducto, business_id: user.business_id };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...body, inventario_id: body.inventario_id || null, cantidad_consumida: body.cantidad_consumida || 1 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (editando) setProductos(productos.map(p => p.id === editando.id ? data.producto : p));
      else setProductos([data.producto, ...productos]);
      setShowForm(false);
      setEditando(null);
      setFormProducto({ nombre: "", descripcion: "", precio: "", categoria_id: "", itbis: true, disponible: true, kitchen_station: "cocina", tiempo_preparacion: 0, inventario_id: "", cantidad_consumida: 1 });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function guardarCategoria(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/categorias`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formCategoria, business_id: user.business_id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCategorias([...categorias, data.categoria]);
      setFormCategoria({ nombre: "", color: "#F59E0B" });
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleDisponible(id) {
    try {
      const res = await fetch(`${API}/api/productos/${id}/toggle`, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setProductos(productos.map(p => p.id === id ? data.producto : p));
    } catch (err) { console.error(err); }
  }

  async function eliminarProducto(id) {
    if (!confirm("¿Eliminar este producto? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`${API}/api/productos/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Error al eliminar");
      }
      // Solo actualizar el estado si el backend confirmó el borrado
      setProductos(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err.message);
      console.error(err);
    }
  }

  async function deleteCategoria(id) {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      const res = await fetch(`${API}/api/categorias/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Error al eliminar categoría");
      }
      setCategorias(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setError(err.message);
      console.error(err);
    }
  }

  async function abrirReceta(producto) {
    setShowReceta(producto);
    const [recRes, invRes, uniRes] = await Promise.all([
      fetch(`${API}/api/recetas?producto_id=${producto.id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/api/inventario?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/api/inventario/unidades`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const recData = await recRes.json();
    const invData = await invRes.json();
    const uniData = await uniRes.json();
    setReceta(recData.recetas?.map(r => ({ inventario_id: r.inventario_id, cantidad: r.cantidad, unidad_medida_id: r.unidad_medida_id })) || []);
    setIngredientes(invData.inventario || []);
    setUnidades(uniData.unidades || []);
  }

  async function guardarReceta() {
    await fetch(`${API}/api/recetas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ producto_id: showReceta.id, ingredientes: receta }),
    });
    setShowReceta(null);
    setReceta([]);
  }

  const productosFiltrados = filtroCategoria
    ? productos.filter(p => p.categoria_id === filtroCategoria)
    : productos;

  if (authLoading || loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold"><span className="text-white">SLOT</span><span className="text-amber-400"> SYSTEM</span></h1>
            <p className="text-slate-400 text-sm mt-1">Menú y productos</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push("/dashboard")} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm hover:border-amber-400/50 transition-all">← Dashboard</button>
            <button onClick={() => { setShowForm(!showForm); setEditando(null); setError(""); }}
              className="px-4 py-2 bg-amber-400 text-slate-900 rounded-xl text-sm font-semibold hover:bg-amber-300 transition-all">
              {showForm ? "Cancelar" : tab === "productos" ? "+ Nuevo producto" : "+ Nueva categoría"}
            </button>
          </div>
        </div>

        <div className="flex bg-slate-800 rounded-xl p-1 mb-6 w-fit">
          {[{ id: "productos", label: "Productos" }, { id: "categorias", label: "Categorías" }].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setShowForm(false); }}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-amber-400 text-slate-900" : "text-slate-400 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {error && <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 mb-4"><p className="text-sm text-red-400">{error}</p></div>}

        {showForm && tab === "productos" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">{editando ? "Editar producto" : "Nuevo producto"}</h2>
            <form onSubmit={guardarProducto} className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Nombre</label>
                <input type="text" value={formProducto.nombre} onChange={e => setFormProducto({ ...formProducto, nombre: e.target.value })} required
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Precio (RD$)</label>
                <input type="number" value={formProducto.precio} onChange={e => setFormProducto({ ...formProducto, precio: e.target.value })} required
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-400 uppercase tracking-widest">Descripción</label>
                <input type="text" value={formProducto.descripcion} onChange={e => setFormProducto({ ...formProducto, descripcion: e.target.value })}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Categoría</label>
                <select value={formProducto.categoria_id} onChange={e => setFormProducto({ ...formProducto, categoria_id: e.target.value })}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400">
                  <option value="">Sin categoría</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Estación cocina</label>
                <select value={formProducto.kitchen_station} onChange={e => setFormProducto({ ...formProducto, kitchen_station: e.target.value })}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400">
                  <option value="cocina">Cocina</option>
                  <option value="bar">Bar</option>
                  <option value="caja">Caja</option>
                </select>
              </div>

              <div className="col-span-2 bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">📦 Descuento automático de inventario</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400">Item de inventario vinculado</label>
                    <select value={formProducto.inventario_id} onChange={e => setFormProducto({ ...formProducto, inventario_id: e.target.value })}
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400">
                      <option value="">Sin vinculación</option>
                      {inventario.map(i => <option key={i.id} value={i.id}>{i.nombre} (Stock: {i.stock_actual})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Cantidad a descontar por venta</label>
                    <input type="number" step="0.01" min="0.01" value={formProducto.cantidad_consumida}
                      onChange={e => setFormProducto({ ...formProducto, cantidad_consumida: e.target.value })}
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                  </div>
                </div>
                {formProducto.inventario_id && (
                  <p className="text-xs text-green-400 mt-2">✓ Se descontará {formProducto.cantidad_consumida} unidad(es) del inventario al vender</p>
                )}
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formProducto.itbis} onChange={e => setFormProducto({ ...formProducto, itbis: e.target.checked })} className="w-4 h-4 accent-amber-400" />
                  <span className="text-sm text-slate-300">Aplica ITBIS</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formProducto.disponible} onChange={e => setFormProducto({ ...formProducto, disponible: e.target.checked })} className="w-4 h-4 accent-amber-400" />
                  <span className="text-sm text-slate-300">Disponible</span>
                </label>
              </div>
              <div className="col-span-2">
                <button type="submit" disabled={saving} className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-60">
                  {saving ? "Guardando..." : editando ? "Guardar cambios" : "Crear producto"}
                </button>
              </div>
            </form>
          </div>
        )}

        {showForm && tab === "categorias" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Nueva categoría</h2>
            <form onSubmit={guardarCategoria} className="grid grid-cols-2 gap-4">
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
              <div className="col-span-2">
                <button type="submit" disabled={saving} className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-60">
                  {saving ? "Guardando..." : "Crear categoría"}
                </button>
              </div>
            </form>
          </div>
        )}

        {showReceta && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-1">Receta</h2>
              <p className="text-slate-400 text-sm mb-4">{showReceta.nombre}</p>
              <div className="flex flex-col gap-3 mb-4">
                {receta.map((item, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 items-center">
                    <select value={item.inventario_id} onChange={e => setReceta(receta.map((r, ri) => ri === i ? { ...r, inventario_id: e.target.value } : r))}
                      className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-amber-400">
                      <option value="">Ingrediente</option>
                      {ingredientes.map(ing => <option key={ing.id} value={ing.id}>{ing.nombre}</option>)}
                    </select>
                    <input type="number" value={item.cantidad} placeholder="Cantidad" onChange={e => setReceta(receta.map((r, ri) => ri === i ? { ...r, cantidad: e.target.value } : r))}
                      className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-amber-400" />
                    <select value={item.unidad_medida_id} onChange={e => setReceta(receta.map((r, ri) => ri === i ? { ...r, unidad_medida_id: e.target.value } : r))}
                      className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-amber-400">
                      <option value="">Unidad</option>
                      {unidades.map(u => <option key={u.id} value={u.id}>{u.abreviacion}</option>)}
                    </select>
                    <button onClick={() => setReceta(receta.filter((_, ri) => ri !== i))} className="px-3 py-2 rounded-xl text-xs border border-red-500/30 text-red-400 hover:bg-red-900/20 transition-all">Quitar</button>
                  </div>
                ))}
              </div>
              <button onClick={() => setReceta([...receta, { inventario_id: "", cantidad: "", unidad_medida_id: "" }])} className="w-full py-2 rounded-xl text-sm border border-slate-700 text-slate-300 hover:border-amber-400/50 mb-4 transition-all">+ Agregar ingrediente</button>
              <div className="flex gap-3">
                <button onClick={guardarReceta} className="flex-1 py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all">Guardar receta</button>
                <button onClick={() => { setShowReceta(null); setReceta([]); }} className="flex-1 py-3 rounded-xl text-sm border border-slate-700 hover:border-slate-500 transition-all">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {tab === "productos" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-800 flex gap-2 overflow-x-auto">
              <button onClick={() => setFiltroCategoria("")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${!filtroCategoria ? "bg-amber-400 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                Todos
              </button>
              {categorias.map(c => (
                <button key={c.id} onClick={() => setFiltroCategoria(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filtroCategoria === c.id ? "text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
                  style={filtroCategoria === c.id ? { backgroundColor: c.color } : {}}>
                  {c.nombre}
                </button>
              ))}
            </div>

            {productosFiltrados.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No hay productos en esta categoría</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Producto</th>
                    <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Categoría</th>
                    <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Precio</th>
                    <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Inventario</th>
                    <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Estado</th>
                    <th className="text-left text-xs text-slate-400 uppercase tracking-widest px-6 py-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.map(p => (
                    <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-all">
                      <td className="px-6 py-4">
                        <p className="text-white font-medium">{p.nombre}</p>
                        <p className="text-slate-500 text-xs">{p.descripcion || ""}</p>
                      </td>
                      <td className="px-6 py-4">
                        {p.categorias ? (
                          <span className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: p.categorias.color + "66" }}>{p.categorias.nombre}</span>
                        ) : <span className="text-slate-500 text-xs">Sin categoría</span>}
                      </td>
                      <td className="px-6 py-4 text-amber-400 font-semibold">RD${Number(p.precio).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        {p.inventario_id ? (
                          <span className="text-xs text-green-400">✓ Vinculado ({p.cantidad_consumida} u.)</span>
                        ) : <span className="text-xs text-slate-500">Sin vincular</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${p.disponible ? "bg-green-900/30 text-green-400 border border-green-500/30" : "bg-red-900/30 text-red-400 border border-red-500/30"}`}>
                          {p.disponible ? "Disponible" : "No disponible"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => {
                            setEditando(p);
                            setFormProducto({
                              nombre: p.nombre, descripcion: p.descripcion || "",
                              precio: p.precio, categoria_id: p.categoria_id || "",
                              itbis: p.itbis, disponible: p.disponible,
                              kitchen_station: p.kitchen_station || "cocina",
                              tiempo_preparacion: p.tiempo_preparacion || 0,
                              inventario_id: p.inventario_id || "",
                              cantidad_consumida: p.cantidad_consumida || 1
                            });
                            setShowForm(true); setTab("productos");
                          }} className="px-3 py-1 rounded-lg text-xs border border-slate-600 text-slate-300 hover:border-amber-400/50 hover:text-amber-400 transition-all">Editar</button>
                          <button onClick={() => abrirReceta(p)}
                            className="px-3 py-1 rounded-lg text-xs border border-blue-500/30 text-blue-400 hover:bg-blue-900/20 transition-all">Receta</button>
                          <button onClick={() => toggleDisponible(p.id)}
                            className={`px-3 py-1 rounded-lg text-xs border transition-all ${p.disponible ? "border-orange-500/30 text-orange-400 hover:bg-orange-900/20" : "border-green-500/30 text-green-400 hover:bg-green-900/20"}`}>
                            {p.disponible ? "Deshabilitar" : "Habilitar"}
                          </button>
                          <button onClick={() => eliminarProducto(p.id)}
                            className="px-3 py-1 rounded-lg text-xs border border-red-500/30 text-red-400 hover:bg-red-900/20 transition-all">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "categorias" && (
          <div className="grid grid-cols-3 gap-4">
            {categorias.length === 0 ? (
              <div className="col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">No hay categorías registradas</div>
            ) : categorias.map(c => (
              <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color }}></div>
                  <p className="text-white font-medium">{c.nombre}</p>
                </div>
                <button onClick={() => deleteCategoria(c.id)} className="px-3 py-1 rounded-lg text-xs border border-red-500/30 text-red-400 hover:bg-red-900/20 transition-all">Eliminar</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}