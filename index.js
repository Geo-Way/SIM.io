
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// INVENTARIO
app.post("/api/inventario", async (req, res) => {
  const { nombre, proveedor, cantidad, precio, fecha, ubicacion } = req.body;
  await pool.query(
    "INSERT INTO inventario (nombre, proveedor, cantidad, precio, fecha, ubicacion) VALUES ($1, $2, $3, $4, $5, $6)",
    [nombre, proveedor, cantidad, precio, fecha, ubicacion]
  );
  res.sendStatus(200);
});
app.get("/api/inventario", async (req, res) => {
  const result = await pool.query("SELECT * FROM inventario ORDER BY fecha DESC");
  res.json(result.rows);
});

// MANTENIMIENTO
app.post("/api/mantenimientos", async (req, res) => {
  const { fecha, maquina, linea, tecnico, costo } = req.body;
  await pool.query(
    "INSERT INTO mantenimientos (fecha, maquina, linea, tecnico, costo) VALUES ($1, $2, $3, $4, $5)",
    [fecha, maquina, linea, tecnico, costo]
  );
  res.sendStatus(200);
});
app.get("/api/mantenimientos", async (req, res) => {
  const result = await pool.query("SELECT * FROM mantenimientos ORDER BY fecha DESC");
  res.json(result.rows);
});

// INSPECCION
app.post("/api/inspecciones", async (req, res) => {
  const { fecha, maquina, tecnico, observaciones } = req.body;
  await pool.query(
    "INSERT INTO inspecciones (fecha, maquina, tecnico, observaciones) VALUES ($1, $2, $3, $4)",
    [fecha, maquina, tecnico, observaciones]
  );
  res.sendStatus(200);
});
app.get("/api/inspecciones", async (req, res) => {
  const result = await pool.query("SELECT * FROM inspecciones ORDER BY fecha DESC");
  res.json(result.rows);
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
