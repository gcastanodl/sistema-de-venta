"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function CierrePage() {
  const searchParams = useSearchParams();
  const data = searchParams.get("data");

  let cierre = null;
  try { cierre = data ? JSON.parse(decodeURIComponent(data)) : null; } catch (e) { cierre = null; }

  useEffect(() => {
    if (cierre) setTimeout(() => window.print(), 500);
  }, []);

  if (!cierre) return <div>Sin datos</div>;

  const { sesion, ventas, negocio } = cierre;
  const ITBIS_RATE = 0.18;

  const totalVentas = Number(sesion.total_ventas || 0);
  const baseImponible = totalVentas / (1 + ITBIS_RATE);
  const totalITBIS = totalVentas - baseImponible;

  return (
    <div style={{ fontFamily: "Arial, sans-serif", width: "100%", maxWidth: "21.5cm", margin: "0 auto", padding: "1.5cm", background: "white", color: "black", fontSize: "13px", lineHeight: "1.5" }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @media print {
          @page { size: letter; margin: 1.5cm; }
          body { margin: 0; padding: 0; background: white; }
          .no-print { display: none !important; }
        }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 10px; text-align: left; }
        th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; border-bottom: 2px solid #ddd; }
        td { border-bottom: 1px solid #eee; font-size: 13px; }
        .text-right { text-align: right; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", paddingBottom: "15px", borderBottom: "3px solid #1e293b" }}>
        <div>
          <div style={{ fontSize: "24px", fontWeight: "900" }}>{negocio?.nombre || "SLOT SYSTEM"}</div>
          {negocio?.rnc && <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>RNC: {negocio.rnc}</div>}
          {negocio?.direccion && <div style={{ fontSize: "12px", color: "#555" }}>{negocio.direccion}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "18px", fontWeight: "bold", letterSpacing: "2px" }}>CIERRE DE CAJA</div>
          <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>{sesion.fecha_cierre ? new Date(sesion.fecha_cierre).toLocaleString("es-DO") : new Date().toLocaleString("es-DO")}</div>
        </div>
      </div>

      {/* Info sesión */}
      <div style={{ display: "flex", gap: "30px", marginBottom: "20px", fontSize: "13px" }}>
        <div><strong>Apertura:</strong> {new Date(sesion.fecha_apertura).toLocaleString("es-DO")}</div>
        <div><strong>Cajero:</strong> {sesion.users?.nombre} {sesion.users?.apellido}</div>
        <div><strong>Caja:</strong> {sesion.cajas?.nombre}</div>
        <div><strong>Facturas:</strong> {sesion.cantidad_facturas}</div>
      </div>

      {/* 3 totales principales */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px", marginBottom: "25px" }}>
        <div style={{ border: "2px solid #ddd", borderRadius: "8px", padding: "15px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#666", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Total ITBIS (18%)</div>
          <div style={{ fontSize: "22px", fontWeight: "900" }}>RD${totalITBIS.toFixed(2)}</div>
        </div>
        <div style={{ border: "2px solid #ddd", borderRadius: "8px", padding: "15px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#666", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Total ventas (sin ITBIS)</div>
          <div style={{ fontSize: "22px", fontWeight: "900" }}>RD${baseImponible.toFixed(2)}</div>
        </div>
        <div style={{ border: "2px solid #1e293b", borderRadius: "8px", padding: "15px", textAlign: "center", background: "#f8f9fa" }}>
          <div style={{ fontSize: "11px", color: "#666", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Total con ITBIS</div>
          <div style={{ fontSize: "22px", fontWeight: "900" }}>RD${totalVentas.toFixed(2)}</div>
        </div>
      </div>

      {/* Detalle de facturas */}
      <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "10px" }}>Detalle de facturas</div>
      <table>
        <thead>
          <tr>
            <th style={{ width: "60px" }}>#</th>
            <th>Cliente</th>
            <th>Hora</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {(ventas || []).map((v, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{v.nombre_cuenta || v.cliente_nombre || "—"}</td>
              <td>{new Date(v.created_at).toLocaleTimeString("es-DO")}</td>
              <td className="text-right" style={{ fontWeight: "bold" }}>RD${Number(v.total).toFixed(2)}</td>
            </tr>
          ))}
          {(!ventas || ventas.length === 0) && (
            <tr><td colSpan="4" style={{ textAlign: "center", color: "#999", padding: "20px" }}>Sin ventas registradas</td></tr>
          )}
        </tbody>
      </table>

      <div style={{ marginTop: "30px", paddingTop: "15px", borderTop: "2px solid #1e293b", textAlign: "center", fontSize: "12px", color: "#666" }}>
        Documento generado por Slot System — {new Date().toLocaleString("es-DO")}
      </div>

      <div className="no-print" style={{ marginTop: "24px", display: "flex", gap: "10px", justifyContent: "center" }}>
        <button onClick={() => window.print()} style={{ padding: "12px 30px", background: "#F59E0B", color: "#1e293b", fontWeight: "bold", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}>Imprimir</button>
        <button onClick={() => window.close()} style={{ padding: "12px 30px", background: "#e2e8f0", color: "#1e293b", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}>Cerrar</button>
      </div>
    </div>
  );
}

export default function CierrePageWrapper() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <CierrePage />
    </Suspense>
  );
}