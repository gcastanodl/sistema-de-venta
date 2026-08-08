require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    "http://localhost:3000",
    "https://slot-system-frontend.onrender.com"
  ],
  credentials: true
}));
app.use(express.json());

// Rutas
const authRoutes = require("./src/routes/auth");
app.use("/api/auth", authRoutes);

const superadminRoutes = require("./src/routes/superadmin");
app.use("/api/superadmin", superadminRoutes);

const negociosRoutes = require("./src/routes/negocios");
app.use("/api/negocios", negociosRoutes);

const sucursalesRoutes = require("./src/routes/sucursales");
app.use("/api/sucursales", sucursalesRoutes);

const usuariosRoutes = require("./src/routes/usuarios");
app.use("/api/usuarios", usuariosRoutes);

const cajasRoutes = require("./src/routes/cajas");
app.use("/api/cajas", cajasRoutes);

const arqueoRoutes = require("./src/routes/arqueo");
app.use("/api/arqueo", arqueoRoutes);

const categoriasRoutes = require("./src/routes/categorias");
app.use("/api/categorias", categoriasRoutes);

const productosRoutes = require("./src/routes/productos");
app.use("/api/productos", productosRoutes);

const inventarioRoutes = require("./src/routes/inventario");
app.use("/api/inventario", inventarioRoutes);

const recetasRoutes = require("./src/routes/recetas");
app.use("/api/recetas", recetasRoutes);

const ordenesRoutes = require("./src/routes/ordenes");
app.use("/api/ordenes", ordenesRoutes);

const reportesRoutes = require("./src/routes/reportes");
app.use("/api/reportes", reportesRoutes);

const clientesRoutes = require("./src/routes/clientes");
app.use("/api/clientes", clientesRoutes);

const suplidoresRoutes = require("./src/routes/suplidores");
app.use("/api/suplidores", suplidoresRoutes);

const categoriasInventarioRoutes = require("./src/routes/categoriasInventario");
app.use("/api/categorias-inventario", categoriasInventarioRoutes);

const extrasRoutes = require("./src/routes/extras");
app.use("/api/extras", extrasRoutes);

const cuentasPorCobrarRoutes = require("./src/routes/cuentasPorCobrar");
app.use("/api/cuentas-por-cobrar", cuentasPorCobrarRoutes);

const gastosRoutes = require("./src/routes/gastos");
app.use("/api/gastos", gastosRoutes);

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({ mensaje: "SLOT SYSTEM API corriendo ✓" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});