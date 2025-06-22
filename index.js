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
  limits: { fileSize: 500 * 1024 }
});

// Configuración robusta del pool PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Forzar SSL
  max: 5, // reducir conexiones para plan gratuito
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000, // timeout más largo
  statement_timeout: 30000,
  query_timeout: 30000,
});

// Manejo de errores del pool
pool.on('error', (err, client) => {
  console.error('❌ Error en pool PostgreSQL:', err);
});

pool.on('connect', (client) => {
  console.log('✅ Nueva conexión establecida a PostgreSQL');
});

// Variable para controlar si la BD está inicializada
let dbInitialized = false;

// Función para probar la conexión
async function testConnection() {
  try {
    console.log('🔍 Probando conexión a PostgreSQL...');
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Conexión a PostgreSQL exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    return false;
  }
}

// Función para inicializar con múltiples intentos
async function initializeDatabase() {
  const maxRetries = 10;
  let retryDelay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔧 Intento ${attempt}/${maxRetries} de inicialización...`);
      
      // Probar conexión primero
      const connectionOk = await testConnection();
      if (!connectionOk) {
        throw new Error('No se puede establecer conexión');
      }

      const client = await pool.connect();
      
      // Crear extensiones si es necesario
      try {
        await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        console.log('✅ Extensiones verificadas');
      } catch (extError) {
        console.log('⚠️ No se pudieron crear extensiones (normal en algunos hosts)');
      }

      // Crear tabla inventario
      await client.query(`
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
      console.log('✅ Tabla inventario creada/verificada');

      // Crear tabla mantenimiento
      await client.query(`
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
      console.log('✅ Tabla mantenimiento creada/verificada');

      // Verificar tablas
      const tables = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `);
      
      console.log('📋 Tablas en BD:', tables.rows.map(r => r.table_name));
      
      client.release();
      
      dbInitialized = true;
      console.log('🎉 ¡Base de datos inicializada correctamente!');
      return true;

    } catch (error) {
      console.error(`❌ Error en intento ${attempt}:`, error.message);
      
      if (attempt === maxRetries) {
        console.error('💥 Falló inicialización después de', maxRetries, 'intentos');
        console.log('⚠️ El servidor continuará sin base de datos...');
        return false;
      }
      
      console.log(`⏳ Esperando ${retryDelay/1000}s antes del siguiente intento...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      retryDelay = Math.min(retryDelay * 1.5, 10000); // Backoff exponencial
    }
  }
  return false;
}

// Middleware para verificar BD
const checkDB = (req, res, next) => {
  if (!dbInitialized) {
    return res.status(503).json({ 
      error: 'Base de datos no disponible',
      message: 'El sistema está inicializándose, intenta en unos momentos'
    });
  }
  next();
};

// POST - Registrar artículo
app.post('/api/inventario', checkDB, async (req, res) => {
  const {
    nombre, proveedor, cantidad, precio, fecha,
    vidautil, ubicacion, estado, familia, codigobarras
  } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO inventario (
        nombre, proveedor, cantidad, precio, fecha,
        vidautil, ubicacion, estado, familia, codigobarras
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        nombre, proveedor || null, 
        parseInt(cantidad) || 0, 
        parseFloat(precio) || null, 
        fecha || null,
        parseInt(vidautil) || null, 
        ubicacion || null, 
        estado || null, 
        familia || null,
        codigobarras || null
      ]
    );
    
    console.log('✅ Artículo guardado:', result.rows[0].id);
    res.status(201).json({ 
      message: 'Artículo guardado correctamente',
      data: result.rows[0]
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
app.get('/api/inventario', checkDB, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventario ORDER BY created_at DESC');
    console.log('📋 Inventario obtenido:', result.rows.length, 'elementos');
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
app.put('/api/inventario/:id', checkDB, async (req, res) => {
  const { id } = req.params;
  const {
    nombre, proveedor, cantidad, precio, fecha,
    vidautil, ubicacion, estado, familia, codigobarras
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE inventario SET
        nombre=$1, proveedor=$2, cantidad=$3, precio=$4, fecha=$5,
        vidautil=$6, ubicacion=$7, estado=$8, familia=$9, codigobarras=$10,
        updated_at=CURRENT_TIMESTAMP
       WHERE id=$11 RETURNING *`,
      [
        nombre, proveedor, cantidad, precio, fecha,
        vidautil, ubicacion, estado, familia, codigobarras, id
      ]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }
    
    res.json({ 
      message: "Artículo actualizado correctamente",
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error al actualizar:', error);
    res.status(500).json({ 
      error: 'Error al actualizar artículo', 
      details: error.message 
    });
  }
});

// DELETE - Eliminar artículo
app.delete("/api/inventario/:id", checkDB, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM inventario WHERE id = $1 RETURNING id", [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }
    
    res.json({ message: 'Artículo eliminado correctamente' });
  } catch (error) {
    console.error("❌ Error al eliminar:", error);
    res.status(500).json({ 
      error: "Error al eliminar artículo", 
      details: error.message 
    });
  }
});

// GET - Listar mantenimientos
app.get('/api/mantenimiento', checkDB, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM mantenimiento ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error al obtener mantenimientos:', error);
    res.status(500).json({ 
      error: 'Error al obtener mantenimientos', 
      details: error.message 
    });
  }
});

// POST - Guardar mantenimiento
app.post('/api/mantenimiento', checkDB, upload.single('fotoman'), async (req, res) => {
  try {
    let {
      maquina, linea, fecha, tecnico, tiempo,
      sintomas, estadomotor, transmision, hidraulico,
      neumatico, electrico, observaciones, estadoaccion
    } = req.body;

    const fotoman = req.file ? `/uploads/${req.file.filename}` : null;

    // Procesar síntomas para PostgreSQL array
    if (Array.isArray(sintomas)) {
      sintomas = sintomas;
    } else if (typeof sintomas === 'string' && sintomas.trim()) {
      sintomas = [sintomas];
    } else {
      sintomas = [];
    }

    const result = await pool.query(
      `INSERT INTO mantenimiento (
        maquina, linea, fecha, tecnico, tiempo, sintomas,
        estadomotor, transmision, hidraulico,
        neumatico, electrico, observaciones,
        estadoaccion, fotoman
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        maquina, linea, fecha, tecnico, tiempo, sintomas,
        estadomotor, transmision, hidraulico,
        neumatico, electrico, observaciones,
        estadoaccion, fotoman
      ]
    );

    res.status(201).json({ 
      message: 'Mantenimiento guardado correctamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error al guardar mantenimiento:', error);
    res.status(500).json({ 
      error: 'Error al guardar mantenimiento', 
      details: error.message 
    });
  }
});

// PUT y DELETE de mantenimiento (similar estructura)...

// Ruta de salud
app.get('/api/health', async (req, res) => {
  try {
    if (!dbInitialized) {
      return res.status(503).json({
        status: 'Initializing',
        database: 'Connecting...',
        message: 'Base de datos inicializándose'
      });
    }

    const result = await pool.query('SELECT NOW() as timestamp, version() as pg_version');
    res.json({ 
      status: 'OK', 
      database: 'Connected',
      timestamp: result.rows[0].timestamp,
      postgresql: result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1],
      url: 'https://sim-io.onrender.com'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'Error', 
      database: 'Error',
      error: error.message
    });
  }
});

// Ruta por defecto
app.get('/', (req, res) => {
  res.json({
    message: 'SIMio API funcionando',
    status: dbInitialized ? 'Ready' : 'Initializing',
    endpoints: {
      health: '/api/health',
      inventario: '/api/inventario',
      mantenimiento: '/api/mantenimiento'
    }
  });
});

// Inicializar servidor
async function startServer() {
  console.log('🚀 Iniciando SIMio...');
  console.log('🔗 DATABASE_URL:', process.env.DATABASE_URL ? 'Configurada' : 'NO CONFIGURADA');
  
  // Arrancar servidor inmediatamente
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`🎉 Servidor corriendo en puerto ${port}`);
    console.log(`🌐 URL: https://sim-io.onrender.com`);
  });

  // Inicializar BD en paralelo
  initializeDatabase().then(success => {
    if (success) {
      console.log('🎯 Sistema completamente inicializado');
    } else {
      console.log('⚠️ Sistema funcionando en modo limitado (sin BD)');
    }
  });

  // Manejo de cierre
  process.on('SIGTERM', () => {
    console.log('🛑 Cerrando servidor...');
    server.close(() => {
      pool.end(() => {
        console.log('✅ Cerrado correctamente');
        process.exit(0);
      });
    });
  });
}

startServer();
