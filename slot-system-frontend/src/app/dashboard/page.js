"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push("/");
    else if (user.roles?.nombre === "cajero") router.push("/cajero");
  }, [user]);

  function handleLogout() {
    logout();
    router.push("/");
  }

  if (!user) return null;

  const modulos = [
    { icon: "🏪", titulo: "Configuración", desc: "Negocio y sucursales", ruta: "/dashboard/configuracion" },
    { icon: "👥", titulo: "Usuarios", desc: "Empleados y roles", ruta: "/dashboard/usuarios" },
    { icon: "🍽️", titulo: "Menú", desc: "Categorías y productos", ruta: "/dashboard/menu" },
    { icon: "💰", titulo: "Cajas", desc: "Cajas registradoras", ruta: "/dashboard/cajas" },
    { icon: "📊", titulo: "Reportes", desc: "Ventas y cierres", ruta: "/dashboard/reportes" },
    { icon: "📦", titulo: "Inventario", desc: "Stock e ingredientes", ruta: "/dashboard/inventario" },
    { icon: "💸", titulo: "Gastos", desc: "Registro y categorías de gastos", ruta: "/dashboard/gastos" },
    { icon: "🧾", titulo: "Facturación", desc: "Facturas electrónicas DGII", ruta: "/dashboard/facturacion", proximamente: true },
    { icon: "👤", titulo: "Clientes", desc: "Base de clientes", ruta: "/dashboard/clientes" },
    { icon: "📋", titulo: "Recetas", desc: "Ingredientes por producto", ruta: "/dashboard/recetas" },
    { icon: "➕", titulo: "Extras", desc: "Modifiers y extras del menú", ruta: "/dashboard/extras" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold"><span className="text-white">SLOT</span><span className="text-amber-400"> SYSTEM</span></h1>
          <p className="text-slate-400 text-xs mt-0.5">Bienvenido, {user.nombre} {user.apellido} · {user.roles?.nombre}</p>
        </div>
        <button onClick={handleLogout} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm hover:border-red-500/50 hover:text-red-400 transition-all">
          Cerrar sesión
        </button>
      </div>

      <div className="p-8 max-w-4xl mx-auto">
        <p className="text-slate-400 text-sm mb-6">Panel de administración</p>
        <div className="grid grid-cols-4 gap-4">
          {modulos.map((m, i) => (
            <button
              key={i}
              onClick={() => !m.proximamente && router.push(m.ruta)}
              disabled={m.proximamente}
              className={`bg-slate-900 border rounded-2xl p-6 text-left transition-all
                ${m.proximamente
                  ? "border-slate-800 opacity-50 cursor-not-allowed"
                  : "border-slate-800 hover:border-amber-400/50 hover:bg-slate-800/50 active:scale-95"
                }`}
            >
              <div className="text-3xl mb-3">{m.icon}</div>
              <p className="text-white font-semibold text-sm">{m.titulo}</p>
              <p className="text-slate-400 text-xs mt-1">{m.desc}</p>
              {m.proximamente && <p className="text-amber-400/60 text-xs mt-2">Próximamente</p>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}