require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 500 * 1024 } // 500 KB
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Función para inicializar la base de datos
async function initializeDatabase() {
  try {
    console.log('🔧 Iniciando verificación/creación de tablas...');
    
    // Crear tabla inventario si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventario (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        proveedor VARCHAR(255),
        cantidad INTEGER NOT NULL DEFAULT 0,
        precio DECIMAL(10,2),
        fecha DATE,
        vidautil INTEGER,
        ubicacion VARCHAR(255),
        estado VARCHAR(100),
        familia VARCHAR(255),
        codigobarras VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabla inventario verificada/creada');

    // Crear tabla mantenimiento si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mantenimiento (
        id SERIAL PRIMARY KEY,
        maquina VARCHAR(255) NOT NULL,
        linea VARCHAR(255),
        fecha DATE,
        tecnico VARCHAR(255),
        tiempo INTEGER,
        sintomas TEXT[],
        estadomotor VARCHAR(255),
        transmision VARCHAR(255),
        hidraulico VARCHAR(255),
        neumatico VARCHAR(255),
        electrico VARCHAR(255),
        observaciones TEXT,
        estadoaccion VARCHAR(255),
        fotoman VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabla mantenimiento verificada/creada');

    // Verificar que las tablas existen
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE';
    `);
    
    console.log('📋 Tablas disponibles:', tablesResult.rows.map(row => row.table_name));
    console.log('🎉 Base de datos inicializada correctamente');
    
  } catch (error) {
    console.error('❌ Error al inicializar base de datos:', error);
    throw error;
  }
}

// POST - Registrar artículo
app.post('/api/inventario', async (req, res) => {
  const {
    nombre, proveedor, cantidad, precio, fecha,
    vidautil, ubicacion, estado, familia,
    codigobarras
  } = req.body;

  console.log('📝 Intentando guardar artículo:', { nombre, cantidad });

  try {
    const result = await pool.query(
      `INSERT INTO inventario (
        nombre, proveedor, cantidad, precio, fecha,
        vidautil, ubicacion, estado, familia,
        codigobarras
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [
        nombre, proveedor, cantidad, precio, fecha,
        vidautil, ubicacion, estado, familia,
        codigobarras
      ]
    );
    console.log('✅ Artículo guardado con ID:', result.rows[0].id);
    res.status(201).json({ 
      message: 'Artículo guardado correctamente',
      id: result.rows[0].id 
    });
  } catch (error) {
    console.error('❌ Error al guardar:', error);
    res.status(500).json({ 
      error: 'Error al guardar artículo', 
      details: error.message 
    });
  }
});

// GET - Listar artículos
app.get('/api/inventario', async (req, res) => {
  try {
    console.log('📋 Obteniendo lista de inventario...');
    const result = await pool.query('SELECT * FROM inventario ORDER BY created_at DESC');
    console.log('✅ Inventario obtenido:', result.rows.length, 'elementos');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error al obtener artículos:', error);
    res.status(500).json({ 
      error: 'Error al obtener artículos', 
      details: error.message 
    });
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
    const result = await pool.query(
      `UPDATE inventario SET
        nombre=$1, proveedor=$2, cantidad=$3, precio=$4, fecha=$5,
        vidautil=$6, ubicacion=$7, estado=$8, familia=$9, codigobarras=$10,
        updated_at=CURRENT_TIMESTAMP
       WHERE id=$11 RETURNING id`,
      [
        nombre, proveedor, cantidad, precio, fecha,
        vidautil, ubicacion, estado, familia,
        codigobarras, id
      ]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }
    
    res.json({ message: "Artículo actualizado correctamente" });
  } catch (error) {
    console.error('❌ Error al actualizar artículo:', error);
    res.status(500).json({ 
      error: 'Error al actualizar artículo', 
      details: error.message 
    });
  }
});

app.delete("/api/inventario/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query("DELETE FROM inventario WHERE id = $1 RETURNING id", [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }
    
    res.json({ message: 'Artículo eliminado correctamente' });
  } catch (err) {
    console.error("❌ Error al eliminar:", err);
    res.status(500).json({ 
      error: "Error al eliminar artículo", 
      details: err.message 
    });
  }
});

// GET - Listar mantenimientos
app.get('/api/mantenimiento', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM mantenimiento ORDER BY created_at DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Error al obtener mantenimientos:', error);
    res.status(500).json({ 
      error: 'Error al obtener mantenimientos', 
      details: error.message 
    });
  }
});

// POST - Guardar mantenimiento con subida de foto
app.post('/api/mantenimiento', upload.single('fotoman'), async (req, res) => {
  try {
    let {
      maquina, linea, fecha, tecnico, tiempo,
      sintomas, estadomotor, transmision, hidraulico,
      neumatico, electrico, observaciones, estadoaccion
    } = req.body;

    const fotoman = req.file ? `/uploads/${req.file.filename}` : null;

    if (Array.isArray(sintomas) && sintomas.length > 0) {
      sintomas = `{${sintomas.map(s => `"${s}"`).join(',')}}`;
    } else {
      sintomas = '{}';
    }

    const result = await pool.query(
      `INSERT INTO mantenimiento (
        maquina, linea, fecha, tecnico, tiempo, sintomas,
        estadomotor, transmision, hidraulico,
        neumatico, electrico, observaciones,
        estadoaccion, fotoman
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12,
        $13, $14
      ) RETURNING id`,
      [
        maquina, linea, fecha, tecnico, tiempo, sintomas,
        estadomotor, transmision, hidraulico,
        neumatico, electrico, observaciones,
        estadoaccion, fotoman
      ]
    );

    res.status(200).json({ 
      message: 'Mantenimiento guardado correctamente',
      id: result.rows[0].id
    });
  } catch (error) {
    console.error('❌ Error al guardar mantenimiento:', error);
    res.status(500).json({ 
      error: 'Error al guardar mantenimiento', 
      details: error.message 
    });
  }
});

// PUT - Editar mantenimiento con foto
app.put('/api/mantenimiento/:id', upload.single('fotoman'), async (req, res) => {
  const { id } = req.params;
  let {
    maquina, linea, fecha, tecnico, tiempo,
    sintomas, estadomotor, transmision, hidraulico,
    neumatico, electrico, observaciones, estadoaccion
  } = req.body;

  try {
    const fotoman = req.file ? `/uploads/${req.file.filename}` : null;

    if (Array.isArray(sintomas) && sintomas.length > 0) {
      sintomas = `{${sintomas.map(s => `"${s}"`).join(',')}}`;
    } else {
      sintomas = '{}';
    }

    const query = `
      UPDATE mantenimiento SET
        maquina=$1, linea=$2, fecha=$3, tecnico=$4, tiempo=$5,
        sintomas=$6, estadomotor=$7, transmision=$8, hidraulico=$9,
        neumatico=$10, electrico=$11, observaciones=$12,
        estadoaccion=$13${fotoman ? `, fotoman=$14` : ''}, updated_at=CURRENT_TIMESTAMP
      WHERE id=$${fotoman ? 15 : 14} RETURNING id
    `;

    const values = fotoman
      ? [maquina, linea, fecha, tecnico, tiempo, sintomas, estadomotor, transmision, hidraulico,
         neumatico, electrico, observaciones, estadoaccion, fotoman, id]
      : [maquina, linea, fecha, tecnico, tiempo, sintomas, estadomotor, transmision, hidraulico,
         neumatico, electrico, observaciones, estadoaccion, id];

    const result = await pool.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Mantenimiento no encontrado' });
    }

    res.status(200).json({ message: 'Mantenimiento actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar mantenimiento:', error);
    res.status(500).json({ 
      error: 'Error al actualizar mantenimiento', 
      details: error.message 
    });
  }
});

// DELETE - Eliminar mantenimiento
app.delete('/api/mantenimiento/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM mantenimiento WHERE id = $1 RETURNING id', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Mantenimiento no encontrado' });
    }
    
    res.status(200).json({ message: 'Mantenimiento eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar mantenimiento:', error);
    res.status(500).json({ 
      error: 'Error al eliminar mantenimiento', 
      details: error.message 
    });
  }
});

// Ruta de verificación de salud
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'OK', 
      database: 'Connected',
      timestamp: new Date().toISOString(),
      url: 'https://sim-io.onrender.com'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'Error', 
      database: 'Disconnected', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Ruta por defecto
app.get('/', (req, res) => {
  res.json({
    message: 'SIMio API funcionando correctamente',
    endpoints: {
      health: '/api/health',
      inventario: '/api/inventario',
      mantenimiento: '/api/mantenimiento'
    }
  });
});

// Inicializar base de datos y arrancar servidor
async function startServer() {
  try {
    console.log('🚀 Iniciando servidor SIMio...');
    console.log('🔗 DATABASE_URL configurada:', process.env.DATABASE_URL ? 'SÍ' : 'NO');
    
    // Inicializar base de datos
    await initializeDatabase();
    
    // Arrancar servidor
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`🎉 Servidor corriendo en puerto ${port}`);
      console.log(`🌐 URL: https://sim-io.onrender.com`);
      console.log(`💾 Base de datos PostgreSQL: CONECTADA`);
    });

    // Manejar cierre elegante
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM recibido, cerrando servidor...');
      server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('💥 Error crítico al iniciar servidor:', error);
    process.exit(1);
  }
}

// Iniciar aplicación
startServer();
