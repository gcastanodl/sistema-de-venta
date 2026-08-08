"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function ConfiguracionPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [negocio, setNegocio] = useState(null);
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingClave, setSavingClave] = useState(false);
  const [showFormSucursal, setShowFormSucursal] = useState(false);
  const [formSucursal, setFormSucursal] = useState({ nombre: "", direccion: "", telefono: "" });
  const [mensaje, setMensaje] = useState("");
  const [claveDescuento, setClaveDescuento] = useState("");
  const [claveConfirm, setClaveConfirm] = useState("");
  const [descuentoMaximo, setDescuentoMaximo] = useState(100);
  const [mensajeClave, setMensajeClave] = useState("");

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/"); return; }
    if (user.business_id) cargarDatos();
    else setLoading(false);
  }, [user, authLoading]);

  async function cargarDatos() {
    try {
      const [negRes, sucRes] = await Promise.all([
        fetch(`${API}/api/negocios/${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/sucursales?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const negData = await negRes.json();
      const sucData = await sucRes.json();
      const neg = negData.negocio || negData.business;
      setNegocio(neg);
      setSucursales(sucData.sucursales || []);
      if (neg?.descuento_maximo) setDescuentoMaximo(neg.descuento_maximo);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function guardarNegocio(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/negocios/${user.business_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(negocio),
      });
      const data = await res.json();
      setNegocio(data.negocio);
      setMensaje("✓ Cambios guardados");
      setTimeout(() => setMensaje(""), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function guardarClaveDescuento(e) {
    e.preventDefault();
    setMensajeClave("");
    if (claveDescuento.length < 4) { setMensajeClave("La clave debe tener al menos 4 dígitos"); return; }
    if (claveDescuento !== claveConfirm) { setMensajeClave("Las claves no coinciden"); return; }
    setSavingClave(true);
    try {
      const res = await fetch(`${API}/api/negocios/${user.business_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...negocio, clave_descuento: claveDescuento, descuento_maximo: parseFloat(descuentoMaximo) }),
      });
      const data = await res.json();
      setNegocio(data.negocio);
      setClaveDescuento("");
      setClaveConfirm("");
      setMensajeClave("✓ Clave de descuento guardada");
      setTimeout(() => setMensajeClave(""), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingClave(false);
    }
  }

  async function crearSucursal(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/api/sucursales`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formSucursal, business_id: user.business_id }),
      });
      const data = await res.json();
      setSucursales([...sucursales, data.sucursal]);
      setShowFormSucursal(false);
      setFormSucursal({ nombre: "", direccion: "", telefono: "" });
    } catch (err) { console.error(err); }
  }

  async function deleteSucursal(id) {
    if (!confirm("¿Eliminar esta sucursal?")) return;
    try {
      await fetch(`${API}/api/sucursales/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setSucursales(sucursales.filter(s => s.id !== id));
    } catch (err) { console.error(err); }
  }

  if (authLoading || loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold"><span className="text-white">SLOT</span><span className="text-amber-400"> SYSTEM</span></h1>
            <p className="text-slate-400 text-sm mt-1">Configuración del negocio</p>
          </div>
          <button onClick={() => router.push("/dashboard")} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm hover:border-amber-400/50 transition-all">← Dashboard</button>
        </div>

        {!user?.business_id ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <p className="text-slate-400">Tu usuario no tiene un negocio asignado.</p>
            <p className="text-slate-500 text-sm mt-2">Contacta al Super Admin.</p>
          </div>
        ) : (
          <>
            {/* Info del negocio */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Información del negocio</h2>
              {mensaje && <p className="text-green-400 text-sm mb-4">{mensaje}</p>}
              {negocio && (
                <form onSubmit={guardarNegocio} className="grid grid-cols-2 gap-4">
                  {[
                    { key: "nombre", label: "Nombre" },
                    { key: "email", label: "Email" },
                    { key: "rnc", label: "RNC" },
                    { key: "telefono", label: "Teléfono" },
                    { key: "moneda", label: "Moneda" },
                    { key: "direccion", label: "Dirección" },
                  ].map(field => (
                    <div key={field.key} className={field.key === "direccion" ? "col-span-2" : ""}>
                      <label className="text-xs text-slate-400 uppercase tracking-widest">{field.label}</label>
                      <input type="text" value={negocio[field.key] || ""}
                        onChange={e => setNegocio({ ...negocio, [field.key]: e.target.value })}
                        className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <button type="submit" disabled={saving} className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-60">
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Clave de descuento */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-semibold mb-1">Clave de descuento</h2>
              <p className="text-slate-400 text-sm mb-4">Esta clave PIN será requerida al aplicar descuentos en el cobro. Solo administradores deben conocerla.</p>
              {mensajeClave && (
                <p className={`text-sm mb-4 ${mensajeClave.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{mensajeClave}</p>
              )}
              <form onSubmit={guardarClaveDescuento} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest">Nueva clave (PIN numérico)</label>
                  <input type="password" inputMode="numeric" value={claveDescuento}
                    onChange={e => setClaveDescuento(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••••" maxLength={6}
                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest">Confirmar clave</label>
                  <input type="password" inputMode="numeric" value={claveConfirm}
                    onChange={e => setClaveConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••••" maxLength={6}
                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest">Descuento máximo permitido (%)</label>
                  <input type="number" min="1" max="100" value={descuentoMaximo}
                    onChange={e => setDescuentoMaximo(e.target.value)}
                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                </div>
                <div className="flex items-end">
                  {negocio?.clave_descuento && (
                    <p className="text-xs text-green-400 mb-3">✓ Clave configurada actualmente</p>
                  )}
                </div>
                <div className="col-span-2">
                  <button type="submit" disabled={savingClave} className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-60">
                    {savingClave ? "Guardando..." : "Guardar clave de descuento"}
                  </button>
                </div>
              </form>
            </div>

            {/* Sucursales */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Sucursales</h2>
                <button onClick={() => setShowFormSucursal(!showFormSucursal)} className="px-4 py-2 bg-amber-400 text-slate-900 rounded-xl text-sm font-semibold hover:bg-amber-300 transition-all">
                  {showFormSucursal ? "Cancelar" : "+ Nueva sucursal"}
                </button>
              </div>

              {showFormSucursal && (
                <form onSubmit={crearSucursal} className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-800/50 rounded-xl">
                  {[
                    { key: "nombre", label: "Nombre", required: true },
                    { key: "telefono", label: "Teléfono" },
                    { key: "direccion", label: "Dirección" },
                  ].map(field => (
                    <div key={field.key} className={field.key === "direccion" ? "col-span-2" : ""}>
                      <label className="text-xs text-slate-400 uppercase tracking-widest">{field.label}</label>
                      <input type="text" value={formSucursal[field.key]}
                        onChange={e => setFormSucursal({ ...formSucursal, [field.key]: e.target.value })}
                        required={field.required}
                        className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <button type="submit" className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all">Crear sucursal</button>
                  </div>
                </form>
              )}

              {sucursales.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No hay sucursales registradas</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {sucursales.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div>
                        <p className="text-white font-medium">{s.nombre}</p>
                        <p className="text-slate-400 text-sm">{s.direccion || "Sin dirección"} {s.telefono ? `· ${s.telefono}` : ""}</p>
                      </div>
                      <button onClick={() => deleteSucursal(s.id)} className="px-3 py-1 rounded-lg text-xs border border-red-500/30 text-red-400 hover:bg-red-900/20 transition-all">Eliminar</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}