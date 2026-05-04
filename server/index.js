const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Servir archivos estáticos del frontend (Producción)
app.use(express.static(path.join(__dirname, '../client/dist')));

// Configuración de MySQL
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'escombrera_db'
});

db.connect(err => {
    if (err) {
        console.error('Error conectando a la base de datos:', err);
        return;
    }
    console.log('Conectado a MySQL');
});

// Configuración de Multer para fotos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Endpoints

// Obtener categorías
app.get('/api/categorias', (req, res) => {
    db.query('SELECT * FROM categorias', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// Obtener entidades por categoría
app.get('/api/entidades/:categoriaId', (req, res) => {
    db.query('SELECT * FROM entidades WHERE categoria_id = ?', [req.params.categoriaId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// Agregar nueva entidad
app.post('/api/entidades', (req, res) => {
    const { categoria_id, nombre } = req.body;
    db.query('INSERT INTO entidades (categoria_id, nombre) VALUES (?, ?)', [categoria_id, nombre], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ id: result.insertId, categoria_id, nombre });
    });
});

// Registrar movimiento
app.post('/api/movimientos', upload.single('foto'), (req, res) => {
    const { entidad_id, tipo_movimiento, material, volumen, vehiculo_tipo } = req.body;
    const foto_path = req.file ? req.file.filename : null;

    const query = 'INSERT INTO movimientos (entidad_id, tipo_movimiento, material, volumen, vehiculo_tipo, foto_path) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(query, [entidad_id, tipo_movimiento, material, volumen, vehiculo_tipo, foto_path], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Movimiento registrado con éxito', id: result.insertId });
    });
});

// Dashboard: Resumen del día
app.get('/api/dashboard/hoy', (req, res) => {
    const query = `
        SELECT material, SUM(volumen) as total 
        FROM movimientos 
        WHERE DATE(fecha) = CURDATE() AND tipo_movimiento = 'Ingreso'
        GROUP BY material
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// Historial completo
app.get('/api/movimientos/historial', (req, res) => {
    const query = `
        SELECT m.*, e.nombre as entidad_nombre, c.nombre as categoria_nombre
        FROM movimientos m
        JOIN entidades e ON m.entidad_id = e.id
        JOIN categorias c ON e.categoria_id = c.id
        ORDER BY m.fecha DESC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// Ruta comodín para el frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
