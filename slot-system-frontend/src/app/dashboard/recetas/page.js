"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function RecetasPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [productos, setProductos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [productoActivo, setProductoActivo] = useState(null);
  const [recetas, setRecetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [form, setForm] = useState({ inventario_id: "", cantidad: "", unidad_medida_id: "" });

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/"); return; }
    cargarDatos();
  }, [user, authLoading]);

  async function cargarDatos() {
    try {
      const [prodRes, invRes, uniRes] = await Promise.all([
        fetch(`${API}/api/productos?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/inventario?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/inventario/unidades`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [prodData, invData, uniData] = await Promise.all([prodRes.json(), invRes.json(), uniRes.json()]);
      setProductos(prodData.productos || []);
      setInventario(invData.inventario || []);
      setUnidades(uniData.unidades || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function seleccionarProducto(producto) {
    setProductoActivo(producto);
    setError("");
    setForm({ inventario_id: "", cantidad: "", unidad_medida_id: "" });
    const res = await fetch(`${API}/api/recetas?producto_id=${producto.id}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setRecetas(data.recetas || []);
  }

  async function agregarIngrediente(e) {
    e.preventDefault();
    if (!productoActivo) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/recetas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ producto_id: productoActivo.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setRecetas([...recetas, data.receta]);
      setForm({ inventario_id: "", cantidad: "", unidad_medida_id: "" });
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function eliminarIngrediente(id) {
    if (!confirm("¿Eliminar este ingrediente de la receta?")) return;
    await fetch(`${API}/api/recetas/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setRecetas(recetas.filter(r => r.id !== id));
  }

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (authLoading || loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold"><span className="text-white">SLOT</span><span className="text-amber-400"> SYSTEM</span></h1>
            <p className="text-slate-400 text-sm mt-1">Recetas</p>
          </div>
          <button onClick={() => router.push("/dashboard")} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm hover:border-amber-400/50 transition-all">← Dashboard</button>
        </div>

        <div className="grid grid-cols-3 gap-6">

          {/* Lista de productos */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Productos del menú</h2>
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar producto..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-amber-400 mb-3" />
            <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto">
              {productosFiltrados.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No hay productos</p>
              ) : productosFiltrados.map(p => (
                <button key={p.id} onClick={() => seleccionarProducto(p)}
                  className={`text-left p-3 rounded-xl transition-all ${productoActivo?.id === p.id ? "bg-amber-400/20 border border-amber-400/50" : "bg-slate-800/50 border border-slate-700/50 hover:border-slate-600"}`}>
                  <p className="text-white text-sm font-medium">{p.nombre}</p>
                  <p className="text-slate-400 text-xs">RD${Number(p.precio).toFixed(2)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Receta del producto */}
          <div className="col-span-2">
            {!productoActivo ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex items-center justify-center h-full">
                <p className="text-slate-500 text-sm">Selecciona un producto para ver o editar su receta</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold mb-1">{productoActivo.nombre}</h2>
                  <p className="text-slate-400 text-sm mb-4">RD${Number(productoActivo.precio).toFixed(2)}</p>

                  {error && <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 mb-4"><p className="text-sm text-red-400">{error}</p></div>}

                  <h3 className="text-xs text-slate-400 uppercase tracking-widest mb-3">Agregar ingrediente</h3>
                  <form onSubmit={agregarIngrediente} className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-widest">Ingrediente</label>
                      <select value={form.inventario_id} onChange={e => setForm({ ...form, inventario_id: e.target.value })} required
                        className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-amber-400">
                        <option value="">Seleccionar</option>
                        {inventario.map(i => (
                          <option key={i.id} value={i.id}>{i.nombre} ({i.stock_actual} {i.unidades_medida?.abreviacion})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-widest">Cantidad</label>
                      <input type="number" step="0.01" value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} required placeholder="Ej: 2"
                        className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-amber-400" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-widest">Unidad</label>
                      <select value={form.unidad_medida_id} onChange={e => setForm({ ...form, unidad_medida_id: e.target.value })} required
                        className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-amber-400">
                        <option value="">Seleccionar</option>
                        {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.abreviacion})</option>)}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-60">
                        {saving ? "Agregando..." : "+ Agregar ingrediente"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Ingredientes de la receta */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4">Ingredientes de la receta ({recetas.length})</h3>
                  {recetas.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4">Sin ingredientes — agrega el primero arriba</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {recetas.map(r => (
                        <div key={r.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                          <div>
                            <p className="text-white text-sm font-medium">{r.inventario?.nombre}</p>
                            <p className="text-slate-400 text-xs">
                              {r.cantidad} {r.unidades_medida?.abreviacion || r.inventario?.unidades_medida?.abreviacion}
                              <span className="ml-2 text-slate-500">· Stock: {r.inventario?.stock_actual} {r.inventario?.unidades_medida?.abreviacion}</span>
                            </p>
                          </div>
                          <button onClick={() => eliminarIngrediente(r.id)} className="text-xs text-red-400 hover:text-red-300 transition-all">Eliminar</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}