"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CajeroPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/"); return; }
  }, [user, loading]);

  function handleLogout() {
    logout();
    router.push("/");
  }

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold">
            <span className="text-white">SLOT</span>
            <span className="text-amber-400"> SYSTEM</span>
          </h1>
          <p className="text-slate-400 text-xs">Cajero: {user.nombre} {user.apellido}</p>
        </div>
        <button onClick={handleLogout} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm hover:border-red-500/50 hover:text-red-400 transition-all">
          Cerrar sesión
        </button>
      </div>

      <div className="p-8 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => router.push("/cajero/caja")}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-left hover:border-amber-400/50 transition-all">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="text-white font-semibold text-lg">Caja</h3>
            <p className="text-slate-400 text-sm mt-1">Apertura y cierre de caja</p>
          </button>

          <button onClick={() => router.push("/cajero/ventas")}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-left hover:border-amber-400/50 transition-all">
            <div className="text-3xl mb-3">🛒</div>
            <h3 className="text-white font-semibold text-lg">Ventas</h3>
            <p className="text-slate-400 text-sm mt-1">Tomar órdenes y cobrar</p>
          </button>

          <button onClick={() => router.push("/cajero/clientes")}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-left hover:border-amber-400/50 transition-all">
            <div className="text-3xl mb-3">👤</div>
            <h3 className="text-white font-semibold text-lg">Clientes</h3>
            <p className="text-slate-400 text-sm mt-1">Buscar y registrar clientes</p>
          </button>

          <button onClick={() => router.push("/cajero/reimprimir")}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-left hover:border-amber-400/50 transition-all">
            <div className="text-3xl mb-3">🖨️</div>
            <h3 className="text-white font-semibold text-lg">Reimprimir factura</h3>
            <p className="text-slate-400 text-sm mt-1">Reimprimir facturas del día</p>
          </button>

          <button onClick={() => router.push("/cajero/cuentas-por-cobrar")}
            className="bg-slate-900 border border-orange-500/30 rounded-2xl p-8 text-left hover:border-orange-500/60 transition-all col-span-2">
            <div className="text-3xl mb-3">📋</div>
            <h3 className="text-white font-semibold text-lg">Cuentas por cobrar</h3>
            <p className="text-slate-400 text-sm mt-1">Gestionar cuentas pendientes de pago</p>
          </button>
        </div>
      </div>
    </div>
  );
}