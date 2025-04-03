
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./inventario.db', (err) => {
  if (err) return console.error('Error al abrir la base de datos:', err.message);
  console.log('Conectado a la base de datos SQLite.');
});

db.run(`CREATE TABLE IF NOT EXISTS inventario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
)`);

db.run(`CREATE TABLE IF NOT EXISTS mantenimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
)`);

app.get('/api/inventario', (req, res) => {
  db.all('SELECT * FROM inventario', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/inventario', (req, res) => {
  const {
    nombre, proveedor, cantidad, precio, fecha,
    vidaUtil, ubicacion, estado, familia,
    codigoBarras, miniatura
  } = req.body;

  db.run(`INSERT INTO inventario (
    nombre, proveedor, cantidad, precio, fecha,
    vidaUtil, ubicacion, estado, familia,
    codigoBarras, miniatura
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    nombre, proveedor, cantidad, precio, fecha,
    vidaUtil, ubicacion, estado, familia,
    codigoBarras, miniatura
  ],
  function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, ...req.body });
  });
});

app.get('/api/mantenimientos', (req, res) => {
  db.all('SELECT * FROM mantenimientos ORDER BY fechaMantenimiento DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/mantenimientos', (req, res) => {
  const {
    fechaMantenimiento, nombreMaquina, lineaProduccion, tipoMantenimiento,
    descripcionTrabajo, repuestosUtilizados, tiempoParada,
    costoMantenimiento, tecnicoAsignado, observaciones, fotoMantenimiento
  } = req.body;

  db.run(`INSERT INTO mantenimientos (
    fechaMantenimiento, nombreMaquina, lineaProduccion, tipoMantenimiento,
    descripcionTrabajo, repuestosUtilizados, tiempoParada,
    costoMantenimiento, tecnicoAsignado, observaciones, fotoMantenimiento
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    fechaMantenimiento, nombreMaquina, lineaProduccion, tipoMantenimiento,
    descripcionTrabajo, repuestosUtilizados, tiempoParada,
    costoMantenimiento, tecnicoAsignado, observaciones, fotoMantenimiento
  ],
  function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, ...req.body });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});



// Crear tabla si no existe para inspecciones
db.run(`CREATE TABLE IF NOT EXISTS inspecciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT,
  nombreMaquina TEXT,
  tecnicoResponsable TEXT,
  averia TEXT,
  malFuncionamiento TEXT,
  ruidoExcesivo TEXT,
  funcionamientoAnormal TEXT,
  malEstado TEXT,
  paradaEmergencia TEXT,
  observaciones TEXT,
  fotoInspeccion TEXT
)`);

// GET inspecciones
app.get('/api/inspecciones', (req, res) => {
  db.all('SELECT * FROM inspecciones ORDER BY fecha DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST inspeccion
app.post('/api/inspecciones', (req, res) => {
  const {
    fecha, nombreMaquina, tecnicoResponsable,
    averia, malFuncionamiento, ruidoExcesivo,
    funcionamientoAnormal, malEstado, paradaEmergencia,
    observaciones, fotoInspeccion
  } = req.body;

  db.run(`INSERT INTO inspecciones (
    fecha, nombreMaquina, tecnicoResponsable,
    averia, malFuncionamiento, ruidoExcesivo,
    funcionamientoAnormal, malEstado, paradaEmergencia,
    observaciones, fotoInspeccion
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    fecha, nombreMaquina, tecnicoResponsable,
    averia, malFuncionamiento, ruidoExcesivo,
    funcionamientoAnormal, malEstado, paradaEmergencia,
    observaciones, fotoInspeccion
  ],
  function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, ...req.body });
  });
});
