"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function FacturaPage() {
  const searchParams = useSearchParams();
  const data = searchParams.get("data");

  let factura = null;
  try {
    factura = data ? JSON.parse(decodeURIComponent(data)) : null;
  } catch (e) { factura = null; }

  useEffect(() => {
    if (factura) setTimeout(() => window.print(), 500);
  }, []);

  if (!factura) return <div>Sin datos</div>;

  const { items, orden, negocio, total, metodo_pago, monto_recibido, vuelto, fecha, descuento } = factura;
  const metodosLabel = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia" };

  // Calcular desglose fiscal: precios ya incluyen ITBIS
  const ITBIS_RATE = 0.18;
  const itemsConDesglose = (items || []).map(item => {
    const totalItem = Number(item.precio) * item.cantidad;
    const baseImponible = totalItem / (1 + ITBIS_RATE);
    const itbisItem = totalItem - baseImponible;
    return { ...item, totalItem, baseImponible, itbisItem };
  });

  const subtotalSinITBIS = itemsConDesglose.reduce((acc, i) => acc + i.baseImponible, 0);
  const totalITBIS = itemsConDesglose.reduce((acc, i) => acc + i.itbisItem, 0);
  const totalSinDescuento = subtotalSinITBIS + totalITBIS;
  const montoDescuento = descuento ? (totalSinDescuento * descuento / 100) : 0;
  const totalFinal = Number(total);

  // Pagos múltiples
  const pagos = factura.pagos || (metodo_pago ? [{ metodo: metodo_pago, monto: monto_recibido }] : []);

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
        .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 3px; }
        .row span:first-child { flex: 1; padding-right: 8px; word-break: break-word; }
        .row span:last-child { white-space: nowrap; font-weight: bold; }
      `}</style>

      {/* Negocio */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <div style={{ fontSize: "17px", fontWeight: "900" }}>{negocio?.nombre || "SLOT SYSTEM"}</div>
        {negocio?.telefono && <div style={{ fontSize: "11px", marginTop: "2px" }}>{negocio.telefono}</div>}
        {negocio?.direccion && <div style={{ fontSize: "11px" }}>{negocio.direccion}</div>}
        {negocio?.rnc && <div style={{ fontSize: "11px", fontWeight: "bold", marginTop: "2px" }}>RNC: {negocio.rnc}</div>}
      </div>

      <div className="solid" />

      {/* Título */}
      <div style={{ textAlign: "center", margin: "6px 0" }}>
        <div style={{ fontSize: "15px", fontWeight: "bold", letterSpacing: "3px" }}>FACTURA</div>
        <div style={{ fontSize: "11px", marginTop: "2px" }}>{new Date(fecha).toLocaleString("es-DO")}</div>
      </div>

      <div className="dashed" />

      {/* Cliente */}
      <div style={{ margin: "6px 0" }}>
        <div style={{ fontSize: "14px", fontWeight: "bold" }}>{orden?.nombre_cuenta}</div>
        {orden?.cliente_telefono && <div style={{ fontSize: "11px", marginTop: "2px" }}>Tel: {orden.cliente_telefono}</div>}
        {orden?.rnc_cliente && <div style={{ fontSize: "11px", fontWeight: "bold", marginTop: "2px" }}>RNC Cliente: {orden.rnc_cliente}</div>}
      </div>

      <div className="dashed" />

      {/* Header items */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#666", marginBottom: "4px" }}>
        <span style={{ flex: 2 }}>DESCRIPCIÓN</span>
        <span style={{ width: "50px", textAlign: "right" }}>BASE</span>
        <span style={{ width: "40px", textAlign: "right" }}>ITBIS</span>
        <span style={{ width: "50px", textAlign: "right" }}>TOTAL</span>
      </div>

      {/* Items */}
      <div style={{ margin: "4px 0" }}>
        {itemsConDesglose.map((item, i) => (
          <div key={i} style={{ marginBottom: "5px" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold" }}>
              {item.es_extra ? `+ EXTRA: ${item.notas}` : `${item.productos?.nombre} x${item.cantidad}`}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#333" }}>
              <span style={{ flex: 2 }}></span>
              <span style={{ width: "50px", textAlign: "right" }}>RD${item.baseImponible.toFixed(2)}</span>
              <span style={{ width: "40px", textAlign: "right" }}>RD${item.itbisItem.toFixed(2)}</span>
              <span style={{ width: "50px", textAlign: "right", fontWeight: "bold" }}>RD${item.totalItem.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashed" />

      {/* Totales fiscales */}
      <div style={{ margin: "6px 0" }}>
        <div className="row" style={{ fontSize: "12px" }}>
          <span>Subtotal (sin ITBIS)</span>
          <span>RD${subtotalSinITBIS.toFixed(2)}</span>
        </div>
        <div className="row" style={{ fontSize: "12px" }}>
          <span>ITBIS (18%)</span>
          <span>RD${totalITBIS.toFixed(2)}</span>
        </div>
        {descuento > 0 && (
          <div className="row" style={{ fontSize: "12px", color: "#e53e3e" }}>
            <span>Descuento ({descuento}%)</span>
            <span>-RD${montoDescuento.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="solid" />

      <div className="row" style={{ fontSize: "16px", fontWeight: "900", margin: "4px 0 8px 0" }}>
        <span>TOTAL</span><span>RD${totalFinal.toFixed(2)}</span>
      </div>

      <div className="dashed" />

      {/* Pago */}
      <div style={{ margin: "6px 0" }}>
        {pagos.length > 1 ? (
          <>
            <div style={{ fontSize: "11px", color: "#666", marginBottom: "3px" }}>FORMA DE PAGO:</div>
            {pagos.map((p, i) => (
              <div key={i} className="row" style={{ fontSize: "12px" }}>
                <span>{metodosLabel[p.metodo] || p.metodo}</span>
                <span>RD${Number(p.monto).toFixed(2)}</span>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="row" style={{ fontSize: "12px" }}>
              <span>Método de pago</span>
              <span style={{ fontWeight: "normal" }}>{metodosLabel[metodo_pago] || metodo_pago}</span>
            </div>
            <div className="row" style={{ fontSize: "12px" }}>
              <span>Monto recibido</span>
              <span>RD${Number(monto_recibido).toFixed(2)}</span>
            </div>
            {metodo_pago === "efectivo" && vuelto > 0 && (
              <div className="row" style={{ fontSize: "14px", fontWeight: "bold", marginTop: "3px" }}>
                <span>Vuelto</span><span>RD${Number(vuelto).toFixed(2)}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="solid" />
      <div style={{ textAlign: "center", fontSize: "12px", marginTop: "6px" }}>Gracias por su visita</div>
      <div style={{ textAlign: "center", fontSize: "12px", marginBottom: "4px" }}>¡Vuelva pronto!</div>

      <div className="no-print" style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <button onClick={() => window.print()} style={{ width: "100%", padding: "10px", background: "#F59E0B", color: "#1e293b", fontWeight: "bold", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}>Imprimir de nuevo</button>
        <button onClick={() => window.close()} style={{ width: "100%", padding: "10px", background: "#e2e8f0", color: "#1e293b", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}>Cerrar</button>
      </div>
    </div>
  );
}

export default function FacturaPageWrapper() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <FacturaPage />
    </Suspense>
  );
}