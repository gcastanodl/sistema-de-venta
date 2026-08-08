const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function enviarAlertaStockBajo(items, negocio) {
  try {
    console.log("[NOTIFICACIONES] Intentando enviar a:", negocio.email, "desde:", process.env.FROM_EMAIL);
    console.log("[NOTIFICACIONES] API KEY existe:", !!process.env.RESEND_API_KEY);

    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #1e293b;">${item.nombre}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #1e293b;">${item.categorias_inventario?.nombre || "—"}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #1e293b; color: ${item.estado_calculado === "agotado" ? "#f87171" : "#fbbf24"}; font-weight: bold;">
          ${item.stock_actual} ${item.unidades_medida?.abreviacion || ""}
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #1e293b;">${item.stock_minimo} ${item.unidades_medida?.abreviacion || ""}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #1e293b;">
          <span style="background: ${item.estado_calculado === "agotado" ? "#7f1d1d" : "#78350f"}; color: ${item.estado_calculado === "agotado" ? "#fca5a5" : "#fde68a"}; padding: 2px 8px; border-radius: 9999px; font-size: 12px;">
            ${item.estado_calculado === "agotado" ? "Agotado" : "Stock bajo"}
          </span>
        </td>
      </tr>
    `).join("");

    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: negocio.email,
      subject: `⚠ Alerta de inventario — ${negocio.nombre}`,
      html: `
        <div style="font-family: sans-serif; background: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 12px; max-width: 600px; margin: 0 auto;">
          <div style="margin-bottom: 24px;">
            <h1 style="color: #f59e0b; font-size: 24px; margin: 0;">SLOT SYSTEM</h1>
            <p style="color: #94a3b8; margin: 4px 0 0;">Alerta de inventario</p>
          </div>
          <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 16px;">
              Hola, <strong>${negocio.nombre}</strong>. Los siguientes productos tienen stock bajo o están agotados:
            </p>
          </div>
          <table style="width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background: #0f172a;">
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #94a3b8; text-transform: uppercase;">Producto</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #94a3b8; text-transform: uppercase;">Categoría</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #94a3b8; text-transform: uppercase;">Stock actual</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #94a3b8; text-transform: uppercase;">Mínimo</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #94a3b8; text-transform: uppercase;">Estado</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="margin-top: 24px; padding: 16px; background: #1e293b; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-size: 14px; color: #94a3b8;">
              Por favor reponga estos productos lo antes posible para evitar interrupciones en el servicio.
            </p>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #475569; text-align: center;">
            SLOT SYSTEM · Sistema POS · ${new Date().toLocaleString("es-DO")}
          </p>
        </div>
      `
    });

    console.log("[NOTIFICACIONES] Resultado:", JSON.stringify(result));
    return true;
  } catch (err) {
    console.error("[NOTIFICACIONES] Error completo:", JSON.stringify(err));
    return false;
  }
}

module.exports = { enviarAlertaStockBajo };