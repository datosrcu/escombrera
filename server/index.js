const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { getDB } = require('./db');

const app = express();
const port = process.env.PORT || 3000;

// Carpeta de fotos subidas
const uploadsDir = path.resolve(__dirname, 'uploads');
try {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
} catch (err) {
    console.error('[SERVER] Error creando carpeta uploads:', err.message);
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Servir frontend compilado en producción
app.use(express.static(path.join(__dirname, '../client/dist')));

// Configuración de Multer para fotos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname || '.jpg'));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 } // Hasta 15MB
});

// Endpoint de estado de salud y diagnóstico
app.get('/api/status', (req, res) => {
    const db = getDB();
    res.json({
        ok: true,
        dbType: db.type,
        timestamp: new Date().toISOString()
    });
});

// Obtener categorías
app.get('/api/categorias', (req, res) => {
    const db = getDB();
    db.query('SELECT * FROM categorias ORDER BY id ASC', (err, results) => {
        if (err) {
            console.error('[API] Error al obtener categorías:', err);
            return res.status(500).json({ error: 'Error al obtener categorías', details: err.message });
        }
        res.json(results || []);
    });
});

// Obtener entidades por categoría
app.get('/api/entidades/:categoriaId', (req, res) => {
    const db = getDB();
    const catId = req.params.categoriaId;
    db.query('SELECT * FROM entidades WHERE categoria_id = ? ORDER BY nombre ASC', [catId], (err, results) => {
        if (err) {
            console.error('[API] Error al obtener entidades:', err);
            return res.status(500).json({ error: 'Error al obtener entidades', details: err.message });
        }
        res.json(results || []);
    });
});

// Agregar nueva entidad
app.post('/api/entidades', (req, res) => {
    const db = getDB();
    const { categoria_id, nombre } = req.body;
    if (!nombre || !categoria_id) {
        return res.status(400).json({ error: 'Faltan campos requeridos (categoria_id, nombre)' });
    }

    const cleanNombre = nombre.trim().toUpperCase();
    db.query('INSERT INTO entidades (categoria_id, nombre) VALUES (?, ?)', [categoria_id, cleanNombre], (err, result) => {
        if (err) {
            console.error('[API] Error al crear entidad:', err);
            return res.status(500).json({ error: 'Error al crear entidad', details: err.message });
        }
        res.json({ id: result.insertId, categoria_id, nombre: cleanNombre });
    });
});

// Registrar movimiento
app.post('/api/movimientos', (req, res) => {
    upload.single('foto')(req, res, (err) => {
        if (err) {
            console.error('[API] Error multer:', err);
            return res.status(400).json({ error: 'Error procesando archivo de imagen', details: err.message });
        }

        const db = getDB();
        const { entidad_id, tipo_movimiento, material, volumen, vehiculo_tipo } = req.body;
        const foto_path = req.file ? req.file.filename : null;

        const volNum = parseFloat(volumen) || 0;
        const tipoMov = tipo_movimiento || 'Ingreso';
        const mat = material || 'Escombros';
        const vehic = vehiculo_tipo || 'Camión';
        const entId = entidad_id ? parseInt(entidad_id, 10) : null;

        const query = 'INSERT INTO movimientos (entidad_id, tipo_movimiento, material, volumen, vehiculo_tipo, foto_path) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(query, [entId, tipoMov, mat, volNum, vehic, foto_path], (dbErr, result) => {
            if (dbErr) {
                console.error('[API] Error de base de datos:', dbErr);
                return res.status(500).json({ error: 'Error al registrar movimiento en BD', details: dbErr.message });
            }
            res.json({
                message: 'Movimiento registrado con éxito',
                id: result.insertId,
                foto_path
            });
        });
    });
});

// Eliminar un movimiento por ID
app.delete('/api/movimientos/:id', (req, res) => {
    const db = getDB();
    const id = req.params.id;
    db.query('DELETE FROM movimientos WHERE id = ?', [id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error al eliminar movimiento', details: err.message });
        }
        res.json({ ok: true, message: 'Movimiento eliminado correctamente' });
    });
});

// Dashboard: Resumen del día
app.get('/api/dashboard/hoy', (req, res) => {
    const db = getDB();
    const query = `
        SELECT material, SUM(volumen) as total, COUNT(*) as viajes
        FROM movimientos 
        WHERE DATE(fecha) = CURDATE() AND tipo_movimiento = 'Ingreso'
        GROUP BY material
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('[API] Error dashboard hoy:', err);
            return res.status(500).json({ error: 'Error en estadísticas', details: err.message });
        }
        res.json(results || []);
    });
});

// Historial completo
app.get('/api/movimientos/historial', (req, res) => {
    const db = getDB();
    const query = `
        SELECT m.*, 
               COALESCE(e.nombre, 'Sin especificar') as entidad_nombre, 
               COALESCE(c.nombre, 'General') as categoria_nombre
        FROM movimientos m
        LEFT JOIN entidades e ON m.entidad_id = e.id
        LEFT JOIN categorias c ON e.categoria_id = c.id
        ORDER BY m.fecha DESC
        LIMIT 250
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('[API] Error historial:', err);
            return res.status(500).json({ error: 'Error al obtener historial', details: err.message });
        }
        res.json(results || []);
    });
});

// Ruta comodín para SPA en producción
app.get('*splat', (req, res) => {
    const clientIndex = path.join(__dirname, '../client/dist/index.html');
    if (fs.existsSync(clientIndex)) {
        res.sendFile(clientIndex);
    } else {
        res.send('Escombrera Municipal API corriendo. Frontend no compilado aún en client/dist.');
    }
});

app.listen(port, () => {
    console.log(`[SERVER] Servidor Escombrera activo en http://localhost:${port}`);
});
