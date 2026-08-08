let qz = null;

export async function getQZ() {
  if (typeof window === "undefined") return null;
  try {
    if (!qz) {
      qz = (await import("qz-tray")).default;
    }
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect();
    }
    return qz;
  } catch (err) {
    console.warn("QZ Tray no disponible, usando window.print()");
    return null;
  }
}

export async function imprimirTicket(contenidoHtml, nombreImpresora) {
  const qzInstance = await getQZ();
  
  if (!qzInstance) {
    // Fallback a window.print() si QZ no está disponible
    return false;
  }

  try {
    const config = qzInstance.configs.create(nombreImpresora || "default");
    const data = [{
      type: "pixel",
      format: "html",
      flavor: "plain",
      data: contenidoHtml,
      options: { pageWidth: 80 }
    }];
    await qzInstance.print(config, data);
    return true;
  } catch (err) {
    console.error("Error QZ Tray:", err);
    return false;
  }
}