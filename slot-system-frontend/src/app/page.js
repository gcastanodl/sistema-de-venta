"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { loginEmail, loginPin } from "@/lib/api";

export default function LoginPage() {
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [logoClicks, setLogoClicks] = useState(0);
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);
  const [saEmail, setSaEmail] = useState("");
  const [saPassword, setSaPassword] = useState("");
  const [saError, setSaError] = useState("");
  const [saLoading, setSaLoading] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      if (user.roles?.nombre === "cajero") router.push("/cajero");
      else if (user.rol === "superadmin") router.push("/superadmin");
      else router.push("/dashboard");
    }
  }, [user, authLoading]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (mode !== "pin") return;
      if (e.key >= "0" && e.key <= "9") {
        setPin(prev => { if (prev.length >= 6) return prev; return prev + e.key; });
      }
      if (e.key === "Backspace") setPin(prev => prev.slice(0, -1));
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode]);

  function handleLogoClick() {
    const newCount = logoClicks + 1;
    setLogoClicks(newCount);
    if (newCount >= 3) {
      setShowSuperAdmin(true);
      setLogoClicks(0);
    }
    setTimeout(() => setLogoClicks(0), 2000);
  }

  async function handleEmailLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginEmail(email, password);
      login(data.token, data.user);
      if (data.user.roles?.nombre === "cajero") router.push("/cajero");
      else router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSuperAdminLogin(e) {
    e.preventDefault();
    setSaError("");
    setSaLoading(true);
    try {
      const res = await fetch(`${API}/api/superadmin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: saEmail, password: saPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Credenciales incorrectas");
      login(data.token, { ...data.admin, rol: "superadmin" });
      router.push("/superadmin");
    } catch (err) {
      setSaError(err.message);
    } finally {
      setSaLoading(false);
    }
  }

  async function handlePinLogin() {
    if (pin.length < 6) { setError("El PIN debe tener 6 dígitos"); return; }
    setError("");
    setLoading(true);
    try {
      const data = await loginPin(pin);
      login(data.token, data.user);
      if (data.user.roles?.nombre === "cajero") router.push("/cajero");
      else router.push("/dashboard");
    } catch (err) {
      setError(err.message);
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  function handlePinKey(key) {
    if (key === "⌫") { setPin(prev => prev.slice(0, -1)); return; }
    if (pin.length >= 6) return;
    setPin(prev => prev + key);
  }

  const pinKeys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold cursor-pointer select-none" onClick={handleLogoClick}>
            <span className="text-white">SLOT</span>
            <span className="text-amber-400"> SYSTEM</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Sistema POS</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <div className="flex bg-slate-800 rounded-xl p-1 mb-6">
            {[
              { id: "email", label: "Admin / Manager" },
              { id: "pin", label: "Cajero" },
            ].map((tab) => (
              <button key={tab.id} onClick={() => { setMode(tab.id); setError(""); setPin(""); }}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${mode === tab.id ? "bg-amber-400 text-slate-900" : "text-slate-500 hover:text-white"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {mode === "email" && (
            <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Correo</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@negocio.com"
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest">Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-60">
                {loading ? "Verificando..." : "Ingresar"}
              </button>
            </form>
          )}

          {mode === "pin" && (
            <div className="flex flex-col items-center gap-6">
              <p className="text-slate-400 text-xs">PIN de 6 dígitos</p>
              <div className="flex gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full border-2 transition-all ${i < pin.length ? "bg-amber-400 border-amber-400" : "border-slate-600"}`} />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
                {pinKeys.map((k, i) => (
                  <button key={i} onClick={() => handlePinKey(k)} disabled={loading || k === ""}
                    className={`h-14 rounded-2xl text-lg font-semibold transition-all active:scale-95 ${k === "" ? "invisible" : k === "⌫" ? "bg-slate-700 text-slate-400 border border-slate-600" : "bg-slate-800 text-white border border-slate-700 hover:border-amber-400/50"} ${loading ? "opacity-50" : ""}`}>
                    {k}
                  </button>
                ))}
              </div>
              <button onClick={handlePinLogin} disabled={loading || pin.length < 6}
                className="w-full max-w-[240px] py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-40">
                {loading ? "Verificando..." : "Entrar"}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-slate-700 text-xs mt-6">SLOT SYSTEM v1.0 · RD</p>
      </div>

      {showSuperAdmin && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="text-2xl mb-1">🔐</div>
              <h2 className="text-lg font-bold text-white">Acceso restringido</h2>
            </div>

            {saError && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
                <p className="text-sm text-red-400">{saError}</p>
              </div>
            )}

            <form onSubmit={handleSuperAdminLogin} className="flex flex-col gap-4">
              <input type="email" value={saEmail} onChange={e => setSaEmail(e.target.value)}
                placeholder="Correo" required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              <input type="password" value={saPassword} onChange={e => setSaPassword(e.target.value)}
                placeholder="Contraseña" required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
              <button type="submit" disabled={saLoading}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-60">
                {saLoading ? "Verificando..." : "Acceder"}
              </button>
              <button type="button" onClick={() => { setShowSuperAdmin(false); setSaEmail(""); setSaPassword(""); setSaError(""); }}
                className="w-full text-slate-500 text-sm hover:text-slate-300 transition-all">
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}