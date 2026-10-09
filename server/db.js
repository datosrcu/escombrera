const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Inicializamos el conector inteligente (MySQL con fallback transparente a SQLite)
let dbAdapter = null;

const initialCategories = [
    { id: 1, nombre: 'Empresa Privada' },
    { id: 2, nombre: 'Dependencia Municipal' },
    { id: 3, nombre: 'Particular' }
];

const initialEntities = [
    // Empresas Privadas
    { categoria_id: 1, nombre: 'CONTE RIO' },
    { categoria_id: 1, nombre: 'CONTE SOSA' },
    { categoria_id: 1, nombre: 'DIEZ Y ASOC.' },
    { categoria_id: 1, nombre: 'CONTE RANQUEL' },
    { categoria_id: 1, nombre: 'CONTE TETE' },
    { categoria_id: 1, nombre: 'SUPER IMPERIO' },
    { categoria_id: 1, nombre: 'CONTE IMPERIO' },
    { categoria_id: 1, nombre: 'LUNARDI' },
    { categoria_id: 1, nombre: 'KUNZ' },
    { categoria_id: 1, nombre: 'CONTE FENIX' },
    { categoria_id: 1, nombre: 'TECNAC S.R.L.' },
    { categoria_id: 1, nombre: 'SCOPPA' },
    { categoria_id: 1, nombre: 'CONTE MIKI' },
    { categoria_id: 1, nombre: 'CONTE ROLOTTI' },
    { categoria_id: 1, nombre: 'DEMOLICIONES ARMANDO' },
    { categoria_id: 1, nombre: 'CONTE NORTE' },
    { categoria_id: 1, nombre: 'CONTE TUTTI' },
    { categoria_id: 1, nombre: 'M y G' },
    { categoria_id: 1, nombre: 'CONTE ALZACO' },
    { categoria_id: 1, nombre: 'CONTE ARCE' },
    { categoria_id: 1, nombre: 'H P. ELECTRONIC' },
    { categoria_id: 1, nombre: 'COTRECO' },
    { categoria_id: 1, nombre: 'PEDRUEZA' },
    { categoria_id: 1, nombre: 'CASALE' },
    { categoria_id: 1, nombre: 'INELSA' },
    { categoria_id: 1, nombre: 'MANTELECTRIC' },
    { categoria_id: 1, nombre: 'ELECTRO MONTAJE' },
    { categoria_id: 1, nombre: 'INCISA' },
    { categoria_id: 1, nombre: 'OSVALDO GONZALEZ' },
    { categoria_id: 1, nombre: 'ATOMO' },
    { categoria_id: 1, nombre: 'CORRALON GUEMES' },
    // Dependencias Municipales
    { categoria_id: 2, nombre: 'Obras Públicas' },
    { categoria_id: 2, nombre: 'Espacios Verdes' },
    { categoria_id: 2, nombre: 'Higiene Urbana' },
    { categoria_id: 2, nombre: 'Mantenimiento Vial' },
    { categoria_id: 2, nombre: 'Servicios Públicos' },
    { categoria_id: 2, nombre: 'Defensa Civil' },
    // Particulares
    { categoria_id: 3, nombre: 'Consumidor Final' }
];

function initSQLite() {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.resolve(__dirname, 'escombrera.sqlite');
    console.log(`[DB] Usando SQLite local en: ${dbPath}`);

    const sdb = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('[DB] Error abriendo base SQLite:', err.message);
        } else {
            console.log('[DB] Conectado exitosamente a SQLite.');
        }
    });

    // Crear tablas y semillas
    sdb.serialize(() => {
        sdb.run(`
            CREATE TABLE IF NOT EXISTS categorias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL UNIQUE
            )
        `);

        sdb.run(`
            CREATE TABLE IF NOT EXISTS entidades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                categoria_id INTEGER,
                nombre TEXT NOT NULL,
                FOREIGN KEY (categoria_id) REFERENCES categorias(id)
            )
        `);

        sdb.run(`
            CREATE TABLE IF NOT EXISTS movimientos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entidad_id INTEGER,
                tipo_movimiento TEXT NOT NULL,
                material TEXT NOT NULL,
                volumen REAL NOT NULL,
                vehiculo_tipo TEXT,
                foto_path TEXT,
                fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (entidad_id) REFERENCES entidades(id)
            )
        `);

        // Insertar categorías base si no existen
        const insertCat = sdb.prepare('INSERT OR IGNORE INTO categorias (id, nombre) VALUES (?, ?)');
        initialCategories.forEach(cat => {
            insertCat.run(cat.id, cat.nombre);
        });
        insertCat.finalize();

        // Verificar entidades e insertar iniciales
        sdb.get('SELECT COUNT(*) as count FROM entidades', (err, row) => {
            if (!err && row && row.count === 0) {
                console.log('[DB] Inicializando lista de empresas y dependencias en SQLite...');
                const insertEnt = sdb.prepare('INSERT INTO entidades (categoria_id, nombre) VALUES (?, ?)');
                initialEntities.forEach(e => {
                    insertEnt.run(e.categoria_id, e.nombre);
                });
                insertEnt.finalize();
                console.log(`[DB] ${initialEntities.length} entidades cargadas correctamente.`);
            }
        });
    });

    return {
        type: 'sqlite',
        query: (sql, params, callback) => {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            params = params || [];

            // Adaptar funciones MySQL a SQLite
            let adaptedSql = sql
                .replace(/DATE\(fecha\)\s*=\s*CURDATE\(\)/gi, "date(fecha, 'localtime') = date('now', 'localtime')")
                .replace(/CURDATE\(\)/gi, "date('now', 'localtime')")
                .replace(/NOW\(\)/gi, "datetime('now', 'localtime')");

            const trimmed = adaptedSql.trim().toUpperCase();

            if (trimmed.startsWith('SELECT')) {
                sdb.all(adaptedSql, params, (err, rows) => {
                    callback(err, rows);
                });
            } else if (trimmed.startsWith('INSERT')) {
                sdb.run(adaptedSql, params, function (err) {
                    if (err) return callback(err);
                    callback(null, { insertId: this.lastID, affectedRows: this.changes });
                });
            } else {
                sdb.run(adaptedSql, params, function (err) {
                    if (err) return callback(err);
                    callback(null, { affectedRows: this.changes });
                });
            }
        }
    };
}

function initMySQL(mysqlConfig) {
    const mysql = require('mysql2');
    const pool = mysql.createPool({
        ...mysqlConfig,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    return {
        type: 'mysql',
        query: (sql, params, callback) => {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            pool.query(sql, params, (err, results, fields) => {
                callback(err, results);
            });
        }
    };
}

// Inicialización asincrónica con fallback inteligente
function getDB() {
    if (dbAdapter) return dbAdapter;

    const useMySQL = process.env.DB_HOST || process.env.MYSQL_HOST;

    if (useMySQL) {
        try {
            console.log(`[DB] Intentando conexión a MySQL en ${process.env.DB_HOST || 'localhost'}...`);
            const mysql = require('mysql2');
            const testConn = mysql.createConnection({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'escombrera-dev',
                connectTimeout: 2000
            });

            testConn.connect(err => {
                if (err) {
                    console.warn(`[DB] Falló conexión a MySQL (${err.code}). Conmutando automáticamente a SQLite.`);
                    dbAdapter = initSQLite();
                } else {
                    console.log('[DB] Conexión a MySQL exitosa.');
                    testConn.end();
                    dbAdapter = initMySQL({
                        host: process.env.DB_HOST || 'localhost',
                        user: process.env.DB_USER || 'root',
                        password: process.env.DB_PASSWORD || '',
                        database: process.env.DB_NAME || 'escombrera-dev'
                    });
                }
            });
        } catch (e) {
            console.warn('[DB] Error iniciando MySQL, usando SQLite:', e.message);
            dbAdapter = initSQLite();
        }
    } else {
        // En entorno local por defecto sin DB_HOST explícito en .env, usar SQLite para máxima estabilidad y portabilidad
        dbAdapter = initSQLite();
    }

    if (!dbAdapter) {
        dbAdapter = initSQLite();
    }

    return dbAdapter;
}

module.exports = {
    getDB
};
