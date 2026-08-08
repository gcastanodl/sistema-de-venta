"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function VentasPageInner() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ordenIdParam = searchParams.get("orden_id");

  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [extras, setExtras] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [cuentas, setCuentas] = useState([]);
  const [cuentaActiva, setCuentaActiva] = useState(null);
  const [sesion, setSesion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [agregando, setAgregando] = useState(false);
  const [error, setError] = useState("");
  const [showNuevaCuenta, setShowNuevaCuenta] = useState(false);
  const [nombreCuenta, setNombreCuenta] = useState("");
  const [telefonoCuenta, setTelefonoCuenta] = useState("");
  const [clientesSugeridos, setClientesSugeridos] = useState([]);
  const [paso, setPaso] = useState("orden");
  const [metodoPago, setMetodoPago] = useState(null);
  const [montoRecibido, setMontoRecibido] = useState("");
  const [vuelto, setVuelto] = useState(0);
  const [ordenCobrada, setOrdenCobrada] = useState(null);
  const [showExtras, setShowExtras] = useState(false);
  const [notaOrden, setNotaOrden] = useState("");
  const [showNota, setShowNota] = useState(false);
  const [negocio, setNegocio] = useState(null);
  const [notificacion, setNotificacion] = useState(null);
  const [rncCliente, setRncCliente] = useState("");

  const [showDescuento, setShowDescuento] = useState(false);
  const [pinDescuento, setPinDescuento] = useState("");
  const [pinValido, setPinValido] = useState(false);
  const [porcentajeDescuento, setPorcentajeDescuento] = useState("");
  const [descuentoMaximo, setDescuentoMaximo] = useState(100);
  const [errorDescuento, setErrorDescuento] = useState("");
  const [descuentoAplicado, setDescuentoAplicado] = useState(0);

  const [pagoMixto, setPagoMixto] = useState(false);
  const [pagos, setPagos] = useState([]);
  const [pagoActual, setPagoActual] = useState({ metodo: "efectivo", monto: "" });

  const cuentaActivaRef = useRef(null);
  const tokenRef = useRef(null);
  const sesionRef = useRef(null);
  const cuentasRef = useRef([]);
  const userIdRef = useRef(null);
  const deletingRef = useRef(new Set());

  const API = process.env.NEXT_PUBLIC_API_URL;
  const ITBIS = 0.18;

  useEffect(() => { cuentaActivaRef.current = cuentaActiva; }, [cuentaActiva]);
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { sesionRef.current = sesion; }, [sesion]);
  useEffect(() => { cuentasRef.current = cuentas; }, [cuentas]);
  useEffect(() => { if (user) userIdRef.current = user.id; }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/"); return; }
    cargarDatos();
  }, [user, authLoading]);

  useEffect(() => {
    if (!ordenIdParam || !sesion || loading) return;
    const seleccionarCuentaCxC = async () => {
      try {
        const res = await fetch(`${API}/api/ordenes/${ordenIdParam}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.orden) {
          // Recargar todas las cuentas activas primero para que aparezca en la lista
          await cargarCuentas(sesion.id);
          setCuentaActiva(data.orden);
          setPaso("orden");
        }
      } catch (err) { console.error(err); }
    };
    seleccionarCuentaCxC();
  }, [ordenIdParam, sesion, loading]);

  useEffect(() => {
    if (!sesion) return;
    const channel = supabase
      .channel(`pos-${sesion.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ordenes", filter: `sesion_id=eq.${sesion.id}` }, (payload) => {
        const nuevaOrden = payload.new;
        if (nuevaOrden.usuario_id !== userIdRef.current) {
          mostrarNotificacion(`🆕 Nueva cuenta: ${nuevaOrden.nombre_cuenta || "Sin nombre"}`);
          cargarCuentasSilencioso(sesion.id);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ordenes", filter: `sesion_id=eq.${sesion.id}` }, (payload) => {
        const ordenActualizada = payload.new;
        if (deletingRef.current.has(ordenActualizada.id)) return;
        if (ordenActualizada.estado === "cuenta_por_cobrar") {
          setCuentas(prev => prev.filter(c => c.id !== ordenActualizada.id));
          return;
        }
        if (ordenActualizada.usuario_id !== userIdRef.current) {
          cargarCuentasSilencioso(sesion.id);
          const cuentaActual = cuentaActivaRef.current;
          if (cuentaActual && cuentaActual.id === ordenActualizada.id) recargarCuentaActiva(cuentaActual.id);
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orden_items" }, async (payload) => {
        const nuevoItem = payload.new;
        const cuentaActual = cuentaActivaRef.current;
        const tok = tokenRef.current;
        if (cuentaActual && nuevoItem.orden_id === cuentaActual.id) recargarCuentaActiva(cuentaActual.id);
        const cuentas = cuentasRef.current;
        const cuentaAfectada = cuentas.find(c => c.id === nuevoItem.orden_id);
        if (cuentaAfectada && nuevoItem.usuario_id !== userIdRef.current) {
          try {
            const res = await fetch(`${API}/api/ordenes/${nuevoItem.orden_id}`, { headers: { Authorization: `Bearer ${tok}` } });
            const data = await res.json();
            if (data.orden) {
              const ultimoItem = data.orden.orden_items?.slice(-1)[0];
              const nombreProducto = ultimoItem?.productos?.nombre || ultimoItem?.notas || "producto";
              mostrarNotificacion(`📋 ${cuentaAfectada.nombre_cuenta}: +${nombreProducto}`);
              setCuentas(prev => prev.map(c => c.id === data.orden.id ? { ...c, orden_items: data.orden.orden_items, total: data.orden.total } : c));
            }
          } catch (err) { console.error(err); }
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [sesion]);

  function mostrarNotificacion(mensaje) {
    setNotificacion(mensaje);
    setTimeout(() => setNotificacion(null), 4000);
  }

  async function cargarCuentasSilencioso(sesion_id) {
    try {
      const tok = tokenRef.current;
      const res = await fetch(`${API}/api/ordenes/activas?sesion_id=${sesion_id}`, { headers: { Authorization: `Bearer ${tok}` } });
      const data = await res.json();
      const ordenes = (data.ordenes || []).filter(o => !deletingRef.current.has(o.id));
      setCuentas(ordenes);
    } catch (err) { console.error(err); }
  }

  async function recargarCuentaActiva(ordenId) {
    try {
      const tok = tokenRef.current;
      const res = await fetch(`${API}/api/ordenes/${ordenId}`, { headers: { Authorization: `Bearer ${tok}` } });
      const data = await res.json();
      if (data.orden) {
        setCuentaActiva(data.orden);
        setCuentas(prev => prev.map(c => c.id === data.orden.id ? data.orden : c));
      }
    } catch (err) { console.error(err); }
  }

  async function cargarDatos() {
    try {
      const [catRes, prodRes, extRes, clientesRes, negocioRes] = await Promise.all([
        fetch(`${API}/api/categorias?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/productos?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/extras?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/clientes?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/negocios/${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [catData, prodData, extData, clientesData, negocioData] = await Promise.all([
        catRes.json(), prodRes.json(), extRes.json(), clientesRes.json(), negocioRes.json()
      ]);
      setCategorias(catData.categorias || []);
      setProductos(prodData.productos?.filter(p => p.disponible) || []);
      setExtras(extData.extras?.filter(e => e.disponible) || []);
      setClientes(clientesData.clientes || []);
      const neg = negocioData.negocio || negocioData.business || null;
      setNegocio(neg);
      if (neg?.descuento_maximo) setDescuentoMaximo(neg.descuento_maximo);
      if (catData.categorias?.length > 0) setCategoriaActiva(catData.categorias[0].id);

      const sucRes = await fetch(`${API}/api/sucursales?business_id=${user.business_id}`, { headers: { Authorization: `Bearer ${token}` } });
      const sucData = await sucRes.json();
      if (sucData.sucursales?.length > 0) {
        const cajasRes = await fetch(`${API}/api/cajas?sucursal_id=${sucData.sucursales[0].id}`, { headers: { Authorization: `Bearer ${token}` } });
        const cajasData = await cajasRes.json();
        if (cajasData.cajas?.length > 0) {
          const sesionRes = await fetch(`${API}/api/cajas/sesion-activa?caja_id=${cajasData.cajas[0].id}`, { headers: { Authorization: `Bearer ${token}` } });
          const sesionData = await sesionRes.json();
          if (sesionData.sesion) {
            setSesion(sesionData.sesion);
            await cargarCuentas(sesionData.sesion.id);
          }
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function cargarCuentas(sesion_id) {
    try {
      const res = await fetch(`${API}/api/ordenes/activas?sesion_id=${sesion_id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setCuentas(data.ordenes || []);
    } catch (err) { console.error(err); }
  }

  function buscarCliente(texto) {
    if (!texto || texto.length < 2) { setClientesSugeridos([]); return; }
    const filtrados = clientes.filter(c => c.nombre?.toLowerCase().includes(texto.toLowerCase()) || c.telefono?.includes(texto));
    setClientesSugeridos(filtrados.slice(0, 4));
  }

  function seleccionarCliente(cliente) {
    setNombreCuenta(cliente.nombre);
    setTelefonoCuenta(cliente.telefono || "");
    setClientesSugeridos([]);
  }

  async function crearCuenta() {
    if (!sesion) { setError("Debes abrir la caja primero"); return; }
    setProcesando(true);
    try {
      const res = await fetch(`${API}/api/ordenes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sesion_id: sesion.id, usuario_id: user.id, nombre_cuenta: nombreCuenta || null, cliente_nombre: nombreCuenta || null, cliente_telefono: telefonoCuenta || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCuentas(prev => [...prev, data.orden]);
      setCuentaActiva(data.orden);
      setShowNuevaCuenta(false);
      setNombreCuenta("");
      setTelefonoCuenta("");
      setClientesSugeridos([]);
    } catch (err) { setError(err.message); }
    finally { setProcesando(false); }
  }

  async function agregarProducto(producto) {
    if (!cuentaActiva) { setError("Selecciona o crea una cuenta primero"); return; }
    if (agregando) return;
    setAgregando(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/ordenes/${cuentaActiva.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: [{ producto_id: producto.id, cantidad: 1, precio: Number(producto.precio) }] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const ordenRes = await fetch(`${API}/api/ordenes/${cuentaActiva.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const ordenData = await ordenRes.json();
      setCuentaActiva(ordenData.orden);
      setCuentas(prev => prev.map(c => c.id === cuentaActiva.id ? ordenData.orden : c));
    } catch (err) { setError(err.message); }
    finally { setAgregando(false); }
  }

  async function agregarExtra(extra) {
    if (!cuentaActiva) return;
    setError("");
    try {
      const res = await fetch(`${API}/api/ordenes/${cuentaActiva.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: [{ producto_id: null, cantidad: 1, precio: Number(extra.precio_extra), notas: extra.nombre, es_extra: true, extra_id: extra.id }] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const ordenRes = await fetch(`${API}/api/ordenes/${cuentaActiva.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const ordenData = await ordenRes.json();
      setCuentaActiva(ordenData.orden);
      setCuentas(prev => prev.map(c => c.id === cuentaActiva.id ? ordenData.orden : c));
      setShowExtras(false);
    } catch (err) { setError(err.message); }
  }

  async function eliminarItem(item) {
    if (!cuentaActiva) return;
    try {
      await fetch(`${API}/api/ordenes/${cuentaActiva.id}/items/${item.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const nuevosItems = (cuentaActiva.orden_items || []).filter(i => i.id !== item.id);
      const ordenActualizada = { ...cuentaActiva, orden_items: nuevosItems };
      setCuentaActiva(ordenActualizada);
      setCuentas(prev => prev.map(c => c.id === cuentaActiva.id ? ordenActualizada : c));
    } catch (err) { console.error(err); }
  }

  async function emitirComanda() {
    if (!cuentaActiva) return;
    setProcesando(true);
    try {
      const res = await fetch(`${API}/api/ordenes/${cuentaActiva.id}/comanda`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const comandaData = encodeURIComponent(JSON.stringify({ items: data.items, orden: data.orden, nota: notaOrden, fecha: new Date().toISOString() }));
      window.open(`/cajero/comanda?data=${comandaData}`, "_blank", "width=400,height=600");
      const ordenRes = await fetch(`${API}/api/ordenes/${cuentaActiva.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const ordenData = await ordenRes.json();
      setCuentaActiva({ ...cuentaActiva, ...ordenData.orden });
      setCuentas(prev => prev.map(c => c.id === cuentaActiva.id ? { ...cuentaActiva, ...ordenData.orden } : c));
    } catch (err) { setError(err.message); }
    finally { setProcesando(false); }
  }

  async function verificarPinDescuento() {
    setErrorDescuento("");
    if (pinDescuento.length < 4) { setErrorDescuento("PIN muy corto"); return; }
    try {
      const res = await fetch(`${API}/api/negocios/${user.business_id}/verificar-descuento`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ clave: pinDescuento }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorDescuento(data.message || "Clave incorrecta"); return; }
      setPinValido(true);
      setDescuentoMaximo(data.descuento_maximo || 100);
    } catch (err) { setErrorDescuento("Error al verificar"); }
  }

  function aplicarDescuento() {
    const pct = parseFloat(porcentajeDescuento);
    if (!pct || pct <= 0 || pct > descuentoMaximo) {
      setErrorDescuento(`Descuento debe ser entre 1 y ${descuentoMaximo}%`);
      return;
    }
    setDescuentoAplicado(pct);
    setShowDescuento(false);
    setPinDescuento("");
    setPinValido(false);
    setPorcentajeDescuento("");
  }

  function quitarDescuento() {
    setDescuentoAplicado(0);
    setPinDescuento("");
    setPinValido(false);
    setPorcentajeDescuento("");
  }

  const calcularTotales = (cuenta) => {
    const items = cuenta?.orden_items || [];
    const subtotal = items.reduce((acc, item) => acc + (Number(item.precio) * item.cantidad), 0);
    const itbisTotal = items.reduce((acc, item) => item.productos?.itbis ? acc + (Number(item.precio) * item.cantidad * ITBIS) : acc, 0);
    const totalSinDescuento = subtotal + itbisTotal;
    const montoDescuento = descuentoAplicado > 0 ? (totalSinDescuento * descuentoAplicado / 100) : 0;
    const total = totalSinDescuento - montoDescuento;
    return { subtotal, itbisTotal, total, montoDescuento };
  };

  function abrirPrefactura() {
    if (!cuentaActiva) return;
    const { subtotal, itbisTotal, total } = calcularTotales(cuentaActiva);
    const prefacturaData = encodeURIComponent(JSON.stringify({
      items: agruparItems(cuentaActiva.orden_items),
      orden: { ...cuentaActiva, rnc_cliente: rncCliente },
      negocio, subtotal, itbis: itbisTotal, total,
      descuento: descuentoAplicado,
      fecha: new Date().toISOString()
    }));
    window.open(`/cajero/prefactura?data=${prefacturaData}`, "_blank", "width=400,height=600");
  }

  function abrirFactura() {
    if (!ordenCobrada) return;
    const tots = calcularTotales(ordenCobrada);
    const facturaData = encodeURIComponent(JSON.stringify({
      items: agruparItems(ordenCobrada.orden_items),
      orden: { ...ordenCobrada, rnc_cliente: rncCliente },
      negocio, subtotal: tots.subtotal, itbis: tots.itbisTotal, total: tots.total,
      descuento: descuentoAplicado,
      metodo_pago: metodoPago,
      monto_recibido: montoRecibido,
      pagos: pagos.length > 0 ? pagos : null,
      vuelto,
      fecha: new Date().toISOString()
    }));
    window.open(`/cajero/factura?data=${facturaData}`, "_blank", "width=400,height=600");
  }

  async function eliminarCuenta() {
    if (!cuentaActiva) return;
    if (!confirm("¿Eliminar esta cuenta?")) return;
    const idAEliminar = cuentaActiva.id;
    deletingRef.current.add(idAEliminar);
    setCuentas(prev => prev.filter(c => c.id !== idAEliminar));
    setCuentaActiva(null);
    try {
      await fetch(`${API}/api/ordenes/${idAEliminar}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      await fetch(`${API}/api/cuentas-por-cobrar/cancelar-por-orden/${idAEliminar}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) { console.error(err); }
    finally { setTimeout(() => deletingRef.current.delete(idAEliminar), 3000); }
  }

  async function enviarCuentaPorCobrar() {
    if (!cuentaActiva || !sesion) return;
    setProcesando(true);
    const idCuenta = cuentaActiva.id;
    const nombreCuentaActual = cuentaActiva.nombre_cuenta;
    deletingRef.current.add(idCuenta);
    try {
      const { total } = calcularTotales(cuentaActiva);
      const res = await fetch(`${API}/api/cuentas-por-cobrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          business_id: user.business_id,
          sesion_id: sesion.id,
          orden_id: idCuenta,
          nombre_cuenta: cuentaActiva.nombre_cuenta,
          cliente_nombre: cuentaActiva.cliente_nombre,
          cliente_telefono: cuentaActiva.cliente_telefono,
          total,
          notas: notaOrden || null,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCuentas(prev => prev.filter(c => c.id !== idCuenta));
      setCuentaActiva(null);
      setPaso("orden");
      mostrarNotificacion(`📋 Cuenta por cobrar: ${nombreCuentaActual}`);
    } catch (err) { setError(err.message); deletingRef.current.delete(idCuenta); }
    finally {
      setProcesando(false);
      setTimeout(() => deletingRef.current.delete(idCuenta), 3000);
    }
  }

  async function cobrarCuenta() {
    if (!cuentaActiva) return;
    const { total } = calcularTotales(cuentaActiva);

    if (pagoMixto) {
      const totalPagado = pagos.reduce((acc, p) => acc + Number(p.monto), 0);
      if (Math.abs(totalPagado - total) > 0.01) {
        setError(`El total pagado (RD$${totalPagado.toFixed(2)}) no coincide con el total (RD$${total.toFixed(2)})`);
        return;
      }
      setProcesando(true);
      try {
        const metodoPrincipal = pagos[0].metodo;
        const res = await fetch(`${API}/api/ordenes/${cuentaActiva.id}/cobrar`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ metodo_pago: metodoPrincipal, usuario_id: user.id, sesion_id: sesion.id, monto_recibido: totalPagado, descuento: descuentoAplicado }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setVuelto(0);
        setMetodoPago(metodoPrincipal);
        setMontoRecibido(totalPagado);
        setOrdenCobrada({ ...cuentaActiva, ...data.orden });
        setCuentas(prev => prev.filter(c => c.id !== cuentaActiva.id));
        setPaso("vuelto");
      } catch (err) { setError(err.message); }
      finally { setProcesando(false); }
      return;
    }

    if (!metodoPago || !montoRecibido) return;
    setProcesando(true);
    try {
      const res = await fetch(`${API}/api/ordenes/${cuentaActiva.id}/cobrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ metodo_pago: metodoPago, usuario_id: user.id, sesion_id: sesion.id, monto_recibido: parseFloat(montoRecibido), descuento: descuentoAplicado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setVuelto(data.vuelto || 0);
      setOrdenCobrada({ ...cuentaActiva, ...data.orden });
      setCuentas(prev => prev.filter(c => c.id !== cuentaActiva.id));
      setPaso("vuelto");
    } catch (err) { setError(err.message); }
    finally { setProcesando(false); }
  }

  function nuevaOrden() {
    setCuentaActiva(null);
    setOrdenCobrada(null);
    setMetodoPago(null);
    setMontoRecibido("");
    setVuelto(0);
    setPaso("orden");
    setNotaOrden("");
    setRncCliente("");
    setDescuentoAplicado(0);
    setPagos([]);
    setPagoMixto(false);
    setPagoActual({ metodo: "efectivo", monto: "" });
  }

  const agruparItems = (items) => {
    return Object.values((items || []).reduce((acc, item) => {
      const key = item.es_extra ? `extra-${item.id}` : `${item.producto_id}-${item.enviado_a_cocina}`;
      if (!item.es_extra && acc[key]) acc[key] = { ...acc[key], cantidad: acc[key].cantidad + item.cantidad };
      else acc[key] = { ...item };
      return acc;
    }, {}));
  };

  const { subtotal, itbisTotal, total, montoDescuento } = calcularTotales(cuentaActiva);
  const productosFiltrados = categoriaActiva ? productos.filter(p => p.categoria_id === categoriaActiva) : productos;

  if (authLoading || loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>;

  // PANTALLA VUELTO
  if (paso === "vuelto" && ordenCobrada) {
    const tots = calcularTotales(ordenCobrada);
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-green-400 mb-2">¡Cobrado!</h2>
            <p className="text-slate-400 mb-6">{ordenCobrada.nombre_cuenta}</p>
            <div className="bg-slate-800/50 rounded-xl p-4 mb-4 text-left">
              <h3 className="text-xs text-slate-400 uppercase tracking-widest mb-3">Resumen</h3>
              {agruparItems(ordenCobrada.orden_items).map((item, i) => (
                <div key={i} className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{item.es_extra ? `EXTRA: ${item.notas}` : `${item.productos?.nombre} x${item.cantidad}`}</span>
                  <span className="text-white">RD${(Number(item.precio) * item.cantidad).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-slate-700 mt-3 pt-3">
                <div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Subtotal</span><span>RD${tots.subtotal.toFixed(2)}</span></div>
                {descuentoAplicado > 0 && (
                  <div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Descuento ({descuentoAplicado}%)</span><span className="text-red-400">-RD${tots.montoDescuento.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between font-bold text-base mt-1"><span>Total</span><span className="text-amber-400">RD${tots.total.toFixed(2)}</span></div>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 mb-4 text-left">
              {pagos.length > 0 ? (
                <>
                  <p className="text-xs text-slate-400 mb-2">PAGOS:</p>
                  {pagos.map((p, i) => (
                    <div key={i} className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400 capitalize">{p.metodo}</span>
                      <span className="text-white">RD${Number(p.monto).toFixed(2)}</span>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Método</span><span className="text-white capitalize">{metodoPago}</span></div>
                  <div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Recibido</span><span className="text-white">RD${parseFloat(montoRecibido).toFixed(2)}</span></div>
                  {metodoPago === "efectivo" && vuelto > 0 && (
                    <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-slate-700">
                      <span className="text-slate-300">Vuelto</span>
                      <span className="text-green-400">RD${vuelto.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <button onClick={abrirFactura} className="w-full py-3 rounded-xl font-semibold text-sm bg-blue-500 text-white hover:bg-blue-400 transition-all mb-2">🖨️ Imprimir factura</button>
            <button onClick={nuevaOrden} className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all">Nueva orden</button>
          </div>
        </div>
      </div>
    );
  }

  // PANTALLA COBRO
  if (paso === "cobro") {
    const totalConDescuento = total;
    const totalPagadoMixto = pagos.reduce((acc, p) => acc + Number(p.monto), 0);
    const pendienteMixto = totalConDescuento - totalPagadoMixto;

    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Cobro</h2>
              <p className="text-amber-400 font-bold text-xl">RD${totalConDescuento.toFixed(2)}</p>
            </div>

            {descuentoAplicado > 0 && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-3 mb-4 flex justify-between items-center">
                <span className="text-green-400 text-sm">✓ Descuento {descuentoAplicado}% aplicado (-RD${montoDescuento.toFixed(2)})</span>
                <button onClick={quitarDescuento} className="text-red-400 text-xs hover:text-red-300">Quitar</button>
              </div>
            )}

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <div className="flex gap-2 mb-4">
              <button onClick={() => { setPagoMixto(false); setPagos([]); }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${!pagoMixto ? "bg-amber-400 text-slate-900" : "bg-slate-800 text-slate-300"}`}>
                Un método
              </button>
              <button onClick={() => { setPagoMixto(true); setMetodoPago(null); setMontoRecibido(""); }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${pagoMixto ? "bg-amber-400 text-slate-900" : "bg-slate-800 text-slate-300"}`}>
                Pago mixto
              </button>
            </div>

            {!pagoMixto && (
              !metodoPago ? (
                <div className="flex flex-col gap-3">
                  <button onClick={() => setMetodoPago("efectivo")} className="w-full py-4 rounded-xl font-semibold bg-green-500 text-white hover:bg-green-400 transition-all text-lg">💵 Efectivo</button>
                  <button onClick={() => setMetodoPago("tarjeta")} className="w-full py-4 rounded-xl font-semibold bg-blue-500 text-white hover:bg-blue-400 transition-all text-lg">💳 Tarjeta</button>
                  <button onClick={() => setMetodoPago("transferencia")} className="w-full py-4 rounded-xl font-semibold bg-purple-500 text-white hover:bg-purple-400 transition-all text-lg">📱 Transferencia</button>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <label className="text-xs text-slate-400 uppercase tracking-widest">
                      {metodoPago === "efectivo" ? "Monto recibido en efectivo (RD$)" : metodoPago === "tarjeta" ? "Monto cobrado en tarjeta (RD$)" : "Monto por transferencia (RD$)"}
                    </label>
                    <input type="number" value={montoRecibido} onChange={e => setMontoRecibido(e.target.value)}
                      placeholder={totalConDescuento.toFixed(2)} autoFocus
                      className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-white text-xl outline-none focus:border-amber-400" />
                  </div>
                  {metodoPago === "efectivo" && montoRecibido && (
                    <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 mb-4">
                      <p className="text-green-400 font-bold text-lg text-center">Vuelto: RD${Math.max(0, parseFloat(montoRecibido) - totalConDescuento).toFixed(2)}</p>
                    </div>
                  )}
                  <button onClick={cobrarCuenta} disabled={procesando || !montoRecibido}
                    className="w-full py-3 rounded-xl font-semibold bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-50 mb-2">
                    {procesando ? "Procesando..." : "Confirmar cobro"}
                  </button>
                  <button onClick={() => setMetodoPago(null)} className="w-full text-slate-400 text-sm hover:text-slate-300">← Cambiar método</button>
                </div>
              )
            )}

            {pagoMixto && (
              <div>
                {pagos.length > 0 && (
                  <div className="mb-4 bg-slate-800/50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-2">PAGOS REGISTRADOS:</p>
                    {pagos.map((p, i) => (
                      <div key={i} className="flex justify-between items-center text-sm mb-1">
                        <span className="text-white capitalize">{p.metodo}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400">RD${Number(p.monto).toFixed(2)}</span>
                          <button onClick={() => setPagos(pagos.filter((_, pi) => pi !== i))} className="text-red-400 text-xs">✕</button>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-slate-700 mt-2 pt-2 flex justify-between text-sm font-bold">
                      <span className="text-slate-400">Pendiente</span>
                      <span className={pendienteMixto > 0 ? "text-red-400" : "text-green-400"}>RD${pendienteMixto.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-3 mb-4">
                  <select value={pagoActual.metodo} onChange={e => setPagoActual({ ...pagoActual, metodo: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400">
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="tarjeta">💳 Tarjeta</option>
                    <option value="transferencia">📱 Transferencia</option>
                  </select>
                  <input type="number" value={pagoActual.monto}
                    onChange={e => setPagoActual({ ...pagoActual, monto: e.target.value })}
                    placeholder={`Monto (pendiente: RD$${Math.max(0, pendienteMixto).toFixed(2)})`}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                  <button onClick={() => {
                    if (!pagoActual.monto || parseFloat(pagoActual.monto) <= 0) return;
                    setPagos([...pagos, { metodo: pagoActual.metodo, monto: parseFloat(pagoActual.monto) }]);
                    setPagoActual({ metodo: "efectivo", monto: "" });
                  }} className="w-full py-2 rounded-xl text-sm font-semibold bg-slate-700 text-white hover:bg-slate-600 transition-all">
                    + Agregar pago
                  </button>
                </div>
                <button onClick={cobrarCuenta} disabled={procesando || Math.abs(pendienteMixto) > 0.01}
                  className="w-full py-3 rounded-xl font-semibold bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-50">
                  {procesando ? "Procesando..." : Math.abs(pendienteMixto) > 0.01 ? `Falta RD$${pendienteMixto.toFixed(2)}` : "Confirmar cobro"}
                </button>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              {!descuentoAplicado && (
                <button onClick={() => setShowDescuento(true)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all">
                  % Descuento
                </button>
              )}
              <button onClick={() => setPaso("precuenta")} className="flex-1 text-slate-400 text-sm hover:text-slate-300 py-2">← Volver</button>
            </div>
          </div>
        </div>

        {showDescuento && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold mb-4">Aplicar descuento</h3>
              {errorDescuento && <p className="text-red-400 text-sm mb-3">{errorDescuento}</p>}
              {!pinValido ? (
                <>
                  <label className="text-xs text-slate-400 uppercase tracking-widest">PIN de autorización</label>
                  <input type="password" inputMode="numeric" value={pinDescuento}
                    onChange={e => setPinDescuento(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••••" autoFocus
                    className="w-full mt-1 mb-4 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                  <button onClick={verificarPinDescuento}
                    className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all mb-2">
                    Verificar PIN
                  </button>
                </>
              ) : (
                <>
                  <p className="text-green-400 text-sm mb-4">✓ PIN correcto — máximo {descuentoMaximo}%</p>
                  <label className="text-xs text-slate-400 uppercase tracking-widest">Porcentaje de descuento (%)</label>
                  <input type="number" min="1" max={descuentoMaximo} value={porcentajeDescuento}
                    onChange={e => setPorcentajeDescuento(e.target.value)}
                    placeholder={`1 - ${descuentoMaximo}`} autoFocus
                    className="w-full mt-1 mb-4 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
                  {porcentajeDescuento && (
                    <div className="bg-slate-800/50 rounded-xl p-3 mb-4 text-sm">
                      <div className="flex justify-between"><span className="text-slate-400">Total actual</span><span>RD${total.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Descuento {porcentajeDescuento}%</span><span className="text-red-400">-RD${(total * parseFloat(porcentajeDescuento) / 100).toFixed(2)}</span></div>
                      <div className="flex justify-between font-bold mt-1 pt-1 border-t border-slate-700"><span>Total con descuento</span><span className="text-amber-400">RD${(total - total * parseFloat(porcentajeDescuento) / 100).toFixed(2)}</span></div>
                    </div>
                  )}
                  <button onClick={aplicarDescuento}
                    className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all mb-2">
                    Aplicar descuento
                  </button>
                </>
              )}
              <button onClick={() => { setShowDescuento(false); setPinDescuento(""); setPinValido(false); setErrorDescuento(""); }}
                className="w-full text-slate-400 text-sm hover:text-slate-300">Cancelar</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // PANTALLA PRECUENTA
  if (paso === "precuenta") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-2">Pre-cuenta</h2>
            <p className="text-slate-400 text-sm mb-1">{cuentaActiva?.nombre_cuenta}</p>
            {cuentaActiva?.cliente_telefono && <p className="text-slate-400 text-xs mb-4">📞 {cuentaActiva.cliente_telefono}</p>}

            <div className="mb-4">
              <label className="text-xs text-slate-400 uppercase tracking-widest">RNC del cliente (opcional)</label>
              <input type="text" value={rncCliente} onChange={e => setRncCliente(e.target.value)}
                placeholder="Ej: 101-23456-7"
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-400" />
            </div>

            <div className="flex flex-col gap-2 mb-6">
              {agruparItems(cuentaActiva?.orden_items).map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-800">
                  <div>
                    <p className={`text-sm ${item.es_extra ? "text-purple-400" : "text-white"}`}>
                      {item.es_extra ? `EXTRA: ${item.notas}` : item.productos?.nombre}
                    </p>
                    <p className="text-slate-500 text-xs">x{item.cantidad} × RD${Number(item.precio).toFixed(2)}</p>
                  </div>
                  <p className="text-white font-medium">RD${(Number(item.precio) * item.cantidad).toFixed(2)}</p>
                </div>
              ))}
            </div>

            {notaOrden && (
              <div className="bg-slate-800/50 rounded-xl p-3 mb-4">
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Nota</p>
                <p className="text-slate-300 text-sm">{notaOrden}</p>
              </div>
            )}

            <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
              <div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Subtotal</span><span>RD${subtotal.toFixed(2)}</span></div>
              {descuentoAplicado > 0 && (
                <div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Descuento ({descuentoAplicado}%)</span><span className="text-red-400">-RD${montoDescuento.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-slate-700"><span>Total</span><span className="text-amber-400">RD${total.toFixed(2)}</span></div>
            </div>

            <button onClick={abrirPrefactura} className="w-full py-3 rounded-xl font-semibold text-sm bg-blue-500 text-white hover:bg-blue-400 transition-all mb-2">🖨️ Imprimir pre-factura</button>
            <button onClick={() => setPaso("cobro")} className="w-full py-3 rounded-xl font-semibold bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all mb-2">Proceder al cobro →</button>
            <button onClick={enviarCuentaPorCobrar} disabled={procesando}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-orange-500 text-white hover:bg-orange-400 transition-all mb-3 disabled:opacity-50">
              📋 Enviar a cuentas por cobrar
            </button>
            <button onClick={() => setPaso("orden")} className="w-full text-slate-400 text-sm hover:text-slate-300">← Volver a la orden</button>
          </div>
        </div>
      </div>
    );
  }

  // PANTALLA PRINCIPAL POS
  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {notificacion && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-400 text-slate-900 px-6 py-3 rounded-2xl font-semibold text-sm shadow-2xl animate-bounce">
          {notificacion}
        </div>
      )}

      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/cajero")} className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs hover:border-amber-400/50 transition-all">← Volver</button>
          <h1 className="text-lg font-bold"><span className="text-white">SLOT</span><span className="text-amber-400"> SYSTEM</span></h1>
        </div>
        <div className="flex items-center gap-3">
          {sesion ? <span className="flex items-center gap-2 text-xs text-green-400"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>En vivo</span>
            : <button onClick={() => router.push("/cajero/caja")} className="text-xs text-red-400">⚠ Abrir caja</button>}
          <span className="text-slate-400 text-xs">{user.nombre} {user.apellido}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-48 border-r border-slate-800 flex flex-col bg-slate-900/50 flex-shrink-0">
          <div className="px-3 py-3 border-b border-slate-800">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Cuentas</p>
            <button onClick={() => setShowNuevaCuenta(true)} className="w-full py-2 rounded-xl text-xs font-semibold bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all">+ Nueva cuenta</button>
          </div>

          {showNuevaCuenta && (
            <div className="p-3 border-b border-slate-800">
              <input type="text" value={nombreCuenta}
                onChange={e => { setNombreCuenta(e.target.value); buscarCliente(e.target.value); }}
                placeholder="Nombre o teléfono..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-amber-400 mb-1" autoFocus />
              {clientesSugeridos.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg mb-2 max-h-32 overflow-y-auto">
                  {clientesSugeridos.map(c => (
                    <button key={c.id} onClick={() => seleccionarCliente(c)}
                      className="w-full text-left px-3 py-2 text-xs text-white hover:bg-slate-700 transition-all border-b border-slate-700/50 last:border-0">
                      <p className="font-medium">{c.nombre}</p>
                      <p className="text-slate-400">{c.telefono || "—"}</p>
                    </button>
                  ))}
                </div>
              )}
              <input type="text" value={telefonoCuenta} onChange={e => setTelefonoCuenta(e.target.value)}
                placeholder="Teléfono (opcional)"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-amber-400 mb-2" />
              <div className="flex gap-1">
                <button onClick={crearCuenta} disabled={procesando} className="flex-1 py-1.5 rounded-lg text-xs bg-green-500 text-white hover:bg-green-400 transition-all">Crear</button>
                <button onClick={() => { setShowNuevaCuenta(false); setNombreCuenta(""); setTelefonoCuenta(""); setClientesSugeridos([]); }}
                  className="flex-1 py-1.5 rounded-lg text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all">Cancel</button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2">
            {cuentas.length === 0 ? <p className="text-slate-600 text-xs text-center mt-4">Sin cuentas abiertas</p>
              : cuentas.map(c => (
                <button key={c.id} onClick={async () => {
                  setAgregando(true);
                  try {
                    const res = await fetch(`${API}/api/ordenes/${c.id}`, { headers: { Authorization: `Bearer ${token}` } });
                    const data = await res.json();
                    setCuentaActiva(data.orden);
                    setPaso("orden");
                  } finally { setAgregando(false); }
                }}
                  className={`w-full text-left p-3 rounded-xl mb-2 transition-all ${cuentaActiva?.id === c.id ? "bg-amber-400/20 border border-amber-400/50" : "bg-slate-800/50 border border-slate-700/50 hover:border-slate-600"}`}>
                  <p className="text-white text-xs font-medium truncate">{c.nombre_cuenta}</p>
                  <p className="text-slate-400 text-xs">{(c.orden_items || []).length} items</p>
                  <p className="text-amber-400 text-xs font-bold">RD${Number(c.total || 0).toFixed(2)}</p>
                </button>
              ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex gap-2 px-4 py-3 border-b border-slate-800 overflow-x-auto flex-shrink-0">
            <button onClick={() => setCategoriaActiva(null)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${!categoriaActiva ? "bg-amber-400 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
              Todos
            </button>
            {categorias.map(c => (
              <button key={c.id} onClick={() => setCategoriaActiva(c.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${categoriaActiva === c.id ? "text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
                style={categoriaActiva === c.id ? { backgroundColor: c.color } : {}}>
                {c.nombre}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {error && <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 mb-4"><p className="text-sm text-red-400">{error}</p></div>}
            <div className="grid grid-cols-3 gap-3">
              {productosFiltrados.map(p => (
                <button key={p.id} onClick={() => agregarProducto(p)} disabled={agregando}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-left hover:border-amber-400/50 hover:bg-slate-800/50 transition-all active:scale-95 disabled:opacity-70">
                  <div className="w-full h-2 rounded-full mb-3" style={{ backgroundColor: p.categorias?.color || "#F59E0B" }}></div>
                  <p className="text-white font-medium text-sm leading-tight mb-1">{p.nombre}</p>
                  <p className="text-amber-400 font-bold">RD${Number(p.precio).toLocaleString()}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="w-72 border-l border-slate-800 flex flex-col bg-slate-900 h-full">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm">{cuentaActiva ? cuentaActiva.nombre_cuenta : "Sin cuenta seleccionada"}</h2>
              {cuentaActiva?.cliente_telefono && <p className="text-slate-400 text-xs">📞 {cuentaActiva.cliente_telefono}</p>}
            </div>
            {cuentaActiva && <button onClick={eliminarCuenta} className="text-xs text-red-400 hover:text-red-300 transition-all">✕ Eliminar</button>}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {!cuentaActiva ? <p className="text-slate-500 text-sm text-center mt-8">Crea o selecciona una cuenta</p>
              : (cuentaActiva.orden_items || []).length === 0 ? <p className="text-slate-500 text-sm text-center mt-8">Agrega productos</p>
              : (
                <div className="flex flex-col gap-2">
                  {agruparItems(cuentaActiva.orden_items).map((item, i) => (
                    <div key={i} className={`rounded-xl p-3 ${item.enviado_a_cocina ? "bg-slate-800/30 opacity-60" : item.es_extra ? "bg-purple-900/20 border border-purple-500/20" : "bg-slate-800/50"}`}>
                      <div className="flex justify-between items-start gap-2">
                        <p className={`text-sm font-medium flex-1 ${item.es_extra ? "text-purple-300" : "text-white"}`}>
                          {item.es_extra ? `EXTRA: ${item.notas}` : item.productos?.nombre}
                        </p>
                        <div className="flex items-center gap-1">
                          <p className="text-amber-400 text-sm font-bold">RD${(Number(item.precio) * item.cantidad).toFixed(2)}</p>
                          {!item.enviado_a_cocina && (
                            <button onClick={() => eliminarItem(item)} className="text-red-400 hover:text-red-300 transition-all text-xs ml-1 leading-none">✕</button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-slate-500 text-xs">x{item.cantidad} × RD${Number(item.precio).toFixed(2)}</p>
                        {item.enviado_a_cocina && <span className="text-xs text-green-400">✓ En cocina</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {showNota && cuentaActiva && (
            <div className="px-4 pb-2">
              <input type="text" value={notaOrden} onChange={e => setNotaOrden(e.target.value)}
                placeholder="Nota para la orden..." autoFocus
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-400" />
            </div>
          )}

          <div className="border-t border-slate-800 p-4">
            <div className="flex flex-col gap-1 mb-3">
              <div className="flex justify-between text-sm"><span className="text-slate-400">Subtotal</span><span>RD${subtotal.toFixed(2)}</span></div>
              {descuentoAplicado > 0 && (
                <div className="flex justify-between text-sm"><span className="text-slate-400">Descuento ({descuentoAplicado}%)</span><span className="text-red-400">-RD${montoDescuento.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between font-bold mt-1 pt-2 border-t border-slate-700"><span>Total</span><span className="text-amber-400">RD${total.toFixed(2)}</span></div>
            </div>
            <div className="flex gap-2 mb-2">
              <button onClick={() => setShowExtras(true)} disabled={!cuentaActiva}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 transition-all disabled:opacity-40">➕ Extras</button>
              <button onClick={() => setShowNota(!showNota)} disabled={!cuentaActiva}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all disabled:opacity-40">📝 Nota</button>
            </div>
            <button onClick={emitirComanda} disabled={!cuentaActiva || (cuentaActiva?.orden_items || []).length === 0 || procesando}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-blue-500 text-white hover:bg-blue-400 transition-all disabled:opacity-40 mb-2">🧾 Emitir comanda</button>
            <button onClick={() => setPaso("precuenta")} disabled={!cuentaActiva || (cuentaActiva?.orden_items || []).length === 0}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-amber-400 text-slate-900 hover:bg-amber-300 transition-all disabled:opacity-40">Ver pre-cuenta →</button>
          </div>
        </div>
      </div>

      {showExtras && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Seleccionar extra</h2>
              <button onClick={() => setShowExtras(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            {extras.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No hay extras disponibles</p>
            ) : (
              <div className="flex flex-col gap-2">
                {extras.map(extra => (
                  <button key={extra.id} onClick={() => agregarExtra(extra)}
                    className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-all text-left">
                    <div>
                      <p className="text-white font-medium text-sm">{extra.nombre}</p>
                      {extra.inventario && <p className="text-slate-400 text-xs">{extra.cantidad_consumida} {extra.unidades_medida?.abreviacion} de {extra.inventario.nombre}</p>}
                    </div>
                    <p className="text-amber-400 font-bold">+RD${Number(extra.precio_extra).toFixed(2)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function VentasPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>}>
      <VentasPageInner />
    </Suspense>
  );
}