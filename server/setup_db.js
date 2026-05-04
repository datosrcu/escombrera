const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setup() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        multipleStatements: true
    });

    try {
        console.log('Leyendo db_setup.sql...');
        const sql = fs.readFileSync(path.join(__dirname, 'db_setup.sql'), 'utf8');
        
        console.log('Ejecutando script SQL...');
        await connection.query(sql);
        
        console.log('✅ Base de datos configurada correctamente con todas las empresas y nuevas columnas.');
    } catch (err) {
        console.error('❌ Error al configurar la base de datos:', err);
    } finally {
        await connection.end();
    }
}

setup();
