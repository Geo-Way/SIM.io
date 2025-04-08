
const express = require("express");
const cors = require("cors");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://simiodb_user:KYcPvbImDC4mWmEomCHYrrdNg4KQ3sqq@dpg-cvq3trjipnbc73cj7r00-a.oregon-postgres.render.com/simiodb",
  ssl: { rejectUnauthorized: false }
});

const createTables = async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS inventario (
    id SERIAL PRIMARY KEY,
    nombre TEXT,
    proveedor TEXT,
    cantidad INTEGER,
    precio REAL,
    fecha TEXT,
    vidaUtil TEXT,
    ubicacion TEXT,
    estado TEXT,
    familia TEXT,
    codigoBarras TEXT,
    miniatura TEXT
  );`);

  await pool.query(`CREATE TABLE IF NOT EXISTS mantenimientos (
    id SERIAL PRIMARY KEY,
    fechaMantenimiento TEXT,
    nombreMaquina TEXT,
    lineaProduccion TEXT,
    tipoMantenimiento TEXT,
    descripcionTrabajo TEXT,
    repuestosUtilizados TEXT,
    tiempoParada REAL,
    costoMantenimiento REAL,
    tecnicoAsignado TEXT,
    observaciones TEXT,
    fotoMantenimiento TEXT
  );`);

  await pool.query(`CREATE TABLE IF NOT EXISTS inspecciones (
    id SERIAL PRIMARY KEY,
    maquina TEXT,
    fecha TEXT,
    tecnico TEXT,
    observaciones TEXT,
    foto TEXT
  );`);
};

createTables().then(() => console.log("Tablas listas")).catch(console.error);

// Inventario
app.get("/api/inventario", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM inventario");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/inventario", async (req, res) => {
  const {
    nombre, proveedor, cantidad, precio, fecha,
    vidaUtil, ubicacion, estado, familia,
    codigoBarras, miniatura
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO inventario (
        nombre, proveedor, cantidad, precio, fecha,
        vidaUtil, ubicacion, estado, familia,
        codigoBarras, miniatura
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *;`,
      [nombre, proveedor, cantidad, precio, fecha,
       vidaUtil, ubicacion, estado, familia,
       codigoBarras, miniatura]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mantenimientos
app.post("/api/mantenimientos", async (req, res) => {
  const {
    fechaMantenimiento, nombreMaquina, lineaProduccion,
    tipoMantenimiento, descripcionTrabajo, repuestosUtilizados,
    tiempoParada, costoMantenimiento, tecnicoAsignado,
    observaciones, fotoMantenimiento
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO mantenimientos (
        fechaMantenimiento, nombreMaquina, lineaProduccion,
        tipoMantenimiento, descripcionTrabajo, repuestosUtilizados,
        tiempoParada, costoMantenimiento, tecnicoAsignado,
        observaciones, fotoMantenimiento
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *;`,
      [fechaMantenimiento, nombreMaquina, lineaProduccion,
       tipoMantenimiento, descripcionTrabajo, repuestosUtilizados,
       tiempoParada, costoMantenimiento, tecnicoAsignado,
       observaciones, fotoMantenimiento]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inspecciones
app.post("/api/inspecciones", async (req, res) => {
  const { maquina, fecha, tecnico, observaciones, foto } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO inspecciones (
        maquina, fecha, tecnico, observaciones, foto
      ) VALUES ($1,$2,$3,$4,$5)
      RETURNING *;`,
      [maquina, fecha, tecnico, observaciones, foto]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
