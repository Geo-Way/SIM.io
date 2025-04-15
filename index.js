require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Configuración de CORS y parsers
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuración de almacenamiento para multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Directorio para guardar archivos
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 } // 500 KB
});

// Configuración de la base de datos PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});


// ------------------- INVENTARIO -------------------

// POST - Registrar artículo
app.post('/api/inventario', async (req, res) => {
  const {
    nombre, proveedor, cantidad, precio, fecha,
    vidautil, ubicacion, estado, familia,
    codigobarras
  } = req.body;

  try {
    await pool.query(
      `INSERT INTO inventario (
        nombre, proveedor, cantidad, precio, fecha,
        vidautil, ubicacion, estado, familia,
        codigobarras
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        nombre, proveedor, cantidad, precio, fecha,
        vidautil, ubicacion, estado, familia,
        codigobarras
      ]
    );
    res.status(201).json({ message: 'Artículo guardado correctamente' });
  } catch (error) {
    console.error('Error al guardar artículo:', error);
    res.status(500).json({ error: 'Error al guardar artículo' });
  }
});

// GET - Listar artículos
app.get('/api/inventario', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventario ORDER BY fecha DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener artículos:', error);
    res.status(500).json({ error: 'Error al obtener artículos' });
  }
});

// PUT - Editar artículo
app.put('/api/inventario/:id', async (req, res) => {
  const { id } = req.params;
  const {
    nombre, proveedor, cantidad, precio, fecha,
    vidautil, ubicacion, estado, familia,
    codigobarras
  } = req.body;

  try {
    await pool.query(
      `UPDATE inventario SET
        nombre=$1, proveedor=$2, cantidad=$3, precio=$4, fecha=$5,
        vidautil=$6, ubicacion=$7, estado=$8, familia=$9, codigobarras=$10
       WHERE id=$11`,
      [
        nombre, proveedor, cantidad, precio, fecha,
        vidautil, ubicacion, estado, familia,
        codigobarras, id
      ]
    );
    res.json({ message: "Artículo actualizado correctamente" });
  } catch (error) {
    console.error('Error al actualizar artículo:', error);
    res.status(500).json({ error: 'Error al actualizar artículo' });
  }
});

// DELETE - Eliminar artículo
app.delete("/api/inventario/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM inventario WHERE id = $1", [id]);
    res.sendStatus(200);
  } catch (err) {
    console.error("Error al eliminar artículo:", err);
    res.status(500).send("Error al eliminar artículo");
  }
});


// ------------------- MANTENIMIENTO -------------------

// GET - Listar mantenimientos
app.get('/api/mantenimiento', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM mantenimiento ORDER BY fecha DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener mantenimientos:', error);
    res.status(500).json({ error: 'Error al obtener mantenimientos' });
  }
});

// POST - Guardar mantenimiento (con manejo de foto)
app.post('/api/mantenimiento', upload.single('fotoman'), async (req, res) => {
  try {
    let {
      maquina, linea, fecha, tecnico, tiempo,
      sintomas, estadomotor, transmision, hidraulico,
      neumatico, electrico, observaciones, estadoaccion
    } = req.body;

    // Conversión de "tiempo" a número
    tiempo = parseFloat(tiempo);

    // Convertir fecha a ISO si es válida
    if (fecha) {
      fecha = new Date(fecha).toISOString();
    }

    // Obtener ruta de la imagen, si existe
    const fotoman = req.file ? `/uploads/${req.file.filename}` : null;

    // Manejar "sintomas": si es arreglo, formatearlo; si es string o vacío, ajustarlo
    if (Array.isArray(sintomas) && sintomas.length > 0) {
      sintomas = `{${sintomas.map(s => `"${s}"`).join(',')}}`;
    } else if (typeof sintomas === 'string' && sintomas.trim() !== "") {
      sintomas = `{ "${sintomas}" }`;
    } else {
      sintomas = '{}';
    }

    const insertQuery = `
      INSERT INTO mantenimiento (
        maquina, linea, fecha, tecnico, tiempo, sintomas,
        estadomotor, transmision, hidraulico,
        neumatico, electrico, observaciones,
        estadoaccion, fotoman
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12,
        $13, $14
      )`;

    await pool.query(insertQuery, [
      maquina, linea, fecha, tecnico, tiempo, sintomas,
      estadomotor, transmision, hidraulico,
      neumatico, electrico, observaciones,
      estadoaccion, fotoman
    ]);

    res.status(201).json({ message: 'Mantenimiento guardado correctamente' });
  } catch (error) {
    console.error('Error al guardar mantenimiento:', error);
    res.status(500).json({ error: 'Error al guardar mantenimiento' });
  }
});

// PUT - Editar mantenimiento (con manejo de foto)
app.put('/api/mantenimiento/:id', upload.single('fotoman'), async (req, res) => {
  const { id } = req.params;
  let {
    maquina, linea, fecha, tecnico, tiempo,
    sintomas, estadomotor, transmision, hidraulico,
    neumatico, electrico, observaciones, estadoaccion
  } = req.body;

  try {
    // Conversión de "tiempo" a número
    tiempo = parseFloat(tiempo);

    // Convertir fecha a ISO si es válida
    if (fecha) {
      fecha = new Date(fecha).toISOString();
    }

    // Obtener ruta de la imagen si se sube; si no, se mantiene lo actual
    const fotoman = req.file ? `/uploads/${req.file.filename}` : null;

    // Manejar "sintomas"
    if (Array.isArray(sintomas) && sintomas.length > 0) {
      sintomas = `{${sintomas.map(s => `"${s}"`).join(',')}}`;
    } else if (typeof sintomas === 'string' && sintomas.trim() !== "") {
      sintomas = `{ "${sintomas}" }`;
    } else {
      sintomas = '{}';
    }

    // Construir query de actualización (si se sube nueva foto, actualizar campo fotoman)
    const query = `
      UPDATE mantenimiento SET
        maquina=$1, linea=$2, fecha=$3, tecnico=$4, tiempo=$5,
        sintomas=$6, estadomotor=$7, transmision=$8, hidraulico=$9,
        neumatico=$10, electrico=$11, observaciones=$12,
        estadoaccion=$13${fotoman ? `, fotoman=$14` : ''}
      WHERE id=$${fotoman ? 15 : 14}
    `;

    const values = fotoman
      ? [maquina, linea, fecha, tecnico, tiempo, sintomas, estadomotor,
         transmision, hidraulico, neumatico, electrico, observaciones,
         estadoaccion, fotoman, id]
      : [maquina, linea, fecha, tecnico, tiempo, sintomas, estadomotor,
         transmision, hidraulico, neumatico, electrico, observaciones,
         estadoaccion, id];

    await pool.query(query, values);
    res.status(200).json({ message: 'Mantenimiento actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar mantenimiento:', error);
    res.status(500).json({ error: 'Error al actualizar mantenimiento' });
  }
});

// DELETE - Eliminar mantenimiento
app.delete('/api/mantenimiento/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM mantenimiento WHERE id = $1', [id]);
    res.status(200).json({ message: 'Mantenimiento eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar mantenimiento:', error);
    res.status(500).json({ error: 'Error al eliminar mantenimiento' });
  }
});

// Endpoint para test de salud (opcional)
app.get('/health', (req, res) => {
  res.send('OK');
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
