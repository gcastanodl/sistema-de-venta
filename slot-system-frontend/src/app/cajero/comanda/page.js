"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ComandaPage() {
  const searchParams = useSearchParams();
  const data = searchParams.get("data");

  let comanda = null;
  try {
    comanda = data ? JSON.parse(decodeURIComponent(data)) : null;
  } catch (e) { comanda = null; }

  useEffect(() => {
    if (comanda) setTimeout(() => window.print(), 500);
  }, []);

  if (!comanda) return <div>Sin datos</div>;

  const { items, orden, nota, fecha } = comanda;

  return (
    <div style={{ fontFamily: "'Courier New', monospace", width: "72mm", margin: "0 auto", padding: "4mm 3mm", background: "white", color: "black", fontSize: "13px", lineHeight: "1.5" }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @media print {
          @page { margin: 3mm; size: 80mm auto; }
          body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        .dashed { border-top: 1px dashed #000; margin: 5px 0; }
        .solid { border-top: 2px solid #000; margin: 5px 0; }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <div style={{ fontSize: "22px", fontWeight: "900", letterSpacing: "5px" }}>COMANDA</div>
        <div style={{ fontSize: "11px", marginTop: "2px" }}>{new Date(fecha).toLocaleString("es-DO")}</div>
      </div>

      <div className="solid" />

      {/* Info cuenta */}
      <div style={{ margin: "6px 0" }}>
        <div style={{ fontSize: "16px", fontWeight: "bold", textTransform: "uppercase" }}>{orden?.nombre_cuenta}</div>
        {orden?.cliente_telefono && <div style={{ fontSize: "11px", marginTop: "2px" }}>Tel: {orden.cliente_telefono}</div>}
      </div>

      <div className="dashed" />

      {/* Items */}
      <div style={{ margin: "6px 0" }}>
        {items.map((item, i) => (
          <div key={i} style={{ marginBottom: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontWeight: "bold", fontSize: "15px", flex: 1, paddingRight: "4px", wordBreak: "break-word" }}>
                {item.cantidad}x {item.productos?.nombre || item.notas}
              </span>
              {item.productos?.kitchen_station && (
                <span style={{ fontSize: "10px", fontStyle: "italic", whiteSpace: "nowrap" }}>({item.productos.kitchen_station})</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {nota && (
        <>
          <div className="dashed" />
          <div style={{ margin: "6px 0" }}>
            <div style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase" }}>⚠ NOTA:</div>
            <div style={{ fontSize: "13px", fontStyle: "italic", wordBreak: "break-word" }}>{nota}</div>
          </div>
        </>
      )}

      <div className="solid" />
      <div style={{ textAlign: "center", fontSize: "11px", marginTop: "6px", letterSpacing: "1px" }}>— FIN DE COMANDA —</div>

      <div className="no-print" style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <button onClick={() => window.print()} style={{ width: "100%", padding: "10px", background: "#F59E0B", color: "#1e293b", fontWeight: "bold", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}>Imprimir de nuevo</button>
        <button onClick={() => window.close()} style={{ width: "100%", padding: "10px", background: "#e2e8f0", color: "#1e293b", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}>Cerrar</button>
      </div>
    </div>
  );
}

export default function ComandaPageWrapper() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ComandaPage />
    </Suspense>
  );
}